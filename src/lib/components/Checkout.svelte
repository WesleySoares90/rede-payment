<script>
  import { criarTransacao } from "$lib/api-rede.js";

  let kind = $state("credit");
  let cardholderName = $state("");
  let cardNumber = $state("");
  let securityCode = $state("");
  let amountRaw = $state(""); // valor numérico interno (string com dígitos)
  let installments = $state(1);
  let capture = $state(true);
  let loading = $state(false);
  let resultado = $state(null);
  let erro = $state(null);
  let showConfirmationScreen = $state(false);
  let showDetails = $state(false);
  let tentativas = $state(0);

  // Recorrência
  let isRecorrente = $state(false);
  let frequencia = $state("Monthly");
  let totalCobrancas = $state(12);

  const cartoesTeste = {
    credit:  "4235647728025682",
    debit:   "4761120000000148",
    voucher: "4389357063526690"
  };

  // Bandeira do cartão 
  function detectarBandeira(numero) {
    const n = numero.replace(/\s/g, "");
    if (/^4/.test(n)) return "visa";
    if (/^5[1-5]/.test(n) || /^2(2[2-9][1-9]|[3-6]\d{2}|7[01]\d|720)/.test(n)) return "mastercard";
    if (/^3[47]/.test(n)) return "amex";
    if (/^(636368|438935|504175|451416|636297|5067|4576|4011|506699)/.test(n)) return "elo";
    if (/^(60110|6012|6034[0-4]|6035|6036|6038|6039|604|6041|6042|6043|60458|60460|6047|6048|6049|605|6050|6051|6052|6053|6054|6055|6056|60570|6057[1-9]|6058|6059|606|6060|60612|60613|60614|60615|60616|60617|60618|60619|6062|6063|6064|6065|6066|6067|6068|6069|607|6070|6071|6072|6073|6074|6075|6076|6077|6078|6079|608|6080|60801|60802|60803|60804|60805|60806|60807|60808|60809|6081|6082|6083|6084|6085|6086|6087|6088|6089|609)/.test(n)) return "hipercard";
    if (/^30[0-5]/.test(n) || /^36/.test(n) || /^38/.test(n)) return "diners";
    return null;
  }

  let bandeira = $derived(detectarBandeira(cardNumber));

  const logoBandeira = {
    visa: `<svg viewBox="0 0 48 16" xmlns="http://www.w3.org/2000/svg" width="38" height="13"><text x="0" y="13" font-family="Arial" font-weight="900" font-size="14" fill="#1a1f71" letter-spacing="-0.5">VISA</text></svg>`,
    mastercard: `<svg viewBox="0 0 38 24" xmlns="http://www.w3.org/2000/svg" width="36" height="22"><circle cx="14" cy="12" r="10" fill="#EB001B"/><circle cx="24" cy="12" r="10" fill="#F79E1B"/><path d="M19 5.27A10 10 0 0 1 23 12a10 10 0 0 1-4 6.73A10 10 0 0 1 15 12a10 10 0 0 1 4-6.73z" fill="#FF5F00"/></svg>`,
    amex: `<svg viewBox="0 0 48 16" xmlns="http://www.w3.org/2000/svg" width="38" height="13"><text x="0" y="13" font-family="Arial" font-weight="900" font-size="11" fill="#007bc1" letter-spacing="0.5">AMEX</text></svg>`,
    elo: `<svg viewBox="0 0 48 16" xmlns="http://www.w3.org/2000/svg" width="32" height="13"><text x="0" y="13" font-family="Arial" font-weight="900" font-size="14" fill="#00A4E0" letter-spacing="-0.5">elo</text></svg>`,
    hipercard: `<svg viewBox="0 0 60 16" xmlns="http://www.w3.org/2000/svg" width="52" height="13"><text x="0" y="13" font-family="Arial" font-weight="900" font-size="11" fill="#B3131B" letter-spacing="0.2">HIPER</text></svg>`,
    diners: `<svg viewBox="0 0 60 16" xmlns="http://www.w3.org/2000/svg" width="52" height="13"><text x="0" y="13" font-family="Arial" font-weight="700" font-size="10" fill="#004A97" letter-spacing="0.2">DINERS</text></svg>`,
  };

  //  Máscara de moeda
  function formatarMoeda(digitos) {
    if (!digitos) return "";
    const num = parseInt(digitos, 10);
    if (isNaN(num)) return "";
    return (num / 100).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  let amountDisplay = $derived(formatarMoeda(amountRaw));
  let amountFloat = $derived(amountRaw ? parseInt(amountRaw, 10) / 100 : 0);

  let opcoesParcelamento = $derived(
    Array.from({ length: 12 }, (_, i) => {
      const n = i + 1;
      if (!amountFloat || amountFloat <= 0) return { value: n, label: `${n}x` };
      const v = (amountFloat / n).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      return { value: n, label: `${n}x  R$ ${v}` };
    })
  );

  // Formatadores 
  function formatarCartao(v) {
    return v.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ").trim();
  }
  function filtrarNome(v) {
    return v.toUpperCase().replace(/[^A-Z\s]/g, "").slice(0, 26);
  }
  function filtrarCVV(v) {
    return v.replace(/\D/g, "").slice(0, 4);
  }

  // Handlers 
  function onCardNumberInput(e) {
    const formatted = formatarCartao(e.target.value);
    cardNumber = formatted;
    e.target.value = formatted;
    erro = null;
  }

  function onNomeInput(e) {
    const filtered = filtrarNome(e.target.value);
    cardholderName = filtered;
    e.target.value = filtered;
    erro = null;
  }

  let expirationMonth = $state("");
  let expirationYear = $state("");
  let expirationDisplay = $state("");

  function onExpirationInput(e) {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    let formatted = raw;
    if (raw.length >= 3) {
      formatted = raw.slice(0, 2) + "/" + raw.slice(2);
    }
    if (raw.length >= 2) {
      const m = parseInt(raw.slice(0, 2));
      if (m < 1) formatted = "01" + (raw.length >= 3 ? "/" + raw.slice(2) : "");
      if (m > 12) formatted = "12" + (raw.length >= 3 ? "/" + raw.slice(2) : "");
    }
    expirationDisplay = formatted;
    e.target.value = formatted;
    if (raw.length >= 2) expirationMonth = raw.slice(0, 2);
    if (raw.length === 4) expirationYear = "20" + raw.slice(2);
    erro = null;
  }

  function onCVVInput(e) {
    const filtered = filtrarCVV(e.target.value);
    securityCode = filtered;
    e.target.value = filtered;
    erro = null;
  }

  function onAmountInput(e) {
    const digitos = e.target.value.replace(/\D/g, "").replace(/^0+/, "") || "";
    amountRaw = digitos;
    e.target.value = amountDisplay;
    erro = null;
  }

  function onInstallmentsChange(e) {
    installments = parseInt(e.target.value);
    if (installments > 1) isRecorrente = false;
  }

  function onFrequenciaChange(e) {
    frequencia = e.target.value;
  }

  function onTotalCobrancasInput(e) {
    totalCobrancas = parseInt(e.target.value) || 1;
  }

  function onCaptureChange(e) {
    capture = e.target.checked;
  }

  function onRecorrenteChange(e) {
    isRecorrente = e.target.checked;
    if (isRecorrente) installments = 1;
  }

  // Preencher dados de teste
  function preencherTeste() {
    cardNumber        = formatarCartao(cartoesTeste[kind]);
    expirationDisplay = "01/35";
    expirationMonth   = "01";
    expirationYear    = "2035";
    securityCode      = "123";
    cardholderName    = "JOAO DA SILVA";
    erro = null;
  }

  // Timeout helper 
  function comTimeout(promise, ms) {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Tempo limite atingido. Tente novamente.")), ms)
    );
    return Promise.race([promise, timeout]);
  }

  // Pagamento 
  async function pagar() {
    resultado = null;
    erro = null;
    loading = true;

    try {
      resultado = await comTimeout(
        criarTransacao({
          kind,
          amount: amountFloat,
          installments: parseInt(installments),
          cardholderName,
          cardNumber: cardNumber.replace(/\s/g, ""),
          expirationMonth: parseInt(expirationMonth),
          expirationYear: parseInt(expirationYear),
          securityCode,
          capture,
          isRecorrente,
          frequencia,
          totalCobrancas
        }),
        7000
      );
      tentativas = 0;
      showConfirmationScreen = true;
    } catch (e) {
      tentativas += 1;
      erro = e.message;
      showConfirmationScreen = true;
    } finally {
      loading = false;
    }
  }

  function tentarNovamente() {
    showConfirmationScreen = false;
    resultado = null;
    erro = null;
    showDetails = false;
    pagar();
  }
</script>

<div class="page">
  <div class="card">

    <!-- Header -->
    <div class="card-header">
      <div class="logo">
        <div class="logo-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
          </svg>
        </div>
        <span>Pagamento seguro</span>
      </div>
      <div class="seguro-badge">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        SSL
      </div>
    </div>

    {#if !showConfirmationScreen}
      <!-- Tipo de pagamento -->
      <div class="tipo-tabs">
        {#each [["credit","Crédito"],["debit","Débito"],["voucher","Voucher"]] as [val, label]}
          <button
            type="button"
            class="tab {kind === val ? 'ativo' : ''}"
            onclick={() => { kind = val; isRecorrente = false; }}
          >{label}</button>
        {/each}
      </div>

      <!-- Total a pagar -->
      <div class="total-box">
        <div class="total-left">
          <div class="total-label">TOTAL A PAGAR</div>
          <div class="total-valor">R$ {amountDisplay || '0,00'}</div>
        </div>
        <div class="total-right">
          <div class="total-label">CARTÃO</div>
          <div class="total-cartao-row">
            {#if bandeira && logoBandeira[bandeira]}
              <span class="bandeira-logo">{@html logoBandeira[bandeira]}</span>
            {/if}
            <span class="total-cartao">{cardNumber || "•••• •••• •••• ••••"}</span>
          </div>
        </div>
      </div>

      <!-- Formulário -->
      <form onsubmit={(e) => { e.preventDefault(); pagar(); }}>

        <div class="campo">
          <label for="numero">Número do cartão</label>
          <div class="input-icon">
            <input
              id="numero"
              value={cardNumber}
              oninput={onCardNumberInput}
              placeholder="0000 0000 0000 0000"
              maxlength="19"
              autocomplete="cc-number"
              inputmode="numeric"
              required
            />
            <span class="icon icon-bandeira">
              {#if bandeira && logoBandeira[bandeira]}
                {@html logoBandeira[bandeira]}
              {:else}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                  <line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
              {/if}
            </span>
          </div>
        </div>

        <div class="campo">
          <label for="nome">Nome no cartão</label>
          <input
            id="nome"
            value={cardholderName}
            oninput={onNomeInput}
            placeholder="Como escrito no cartão"
            autocomplete="cc-name"
            required
          />
        </div>

        <div class="row-2">
          <div class="campo">
            <label for="validade">Validade</label>
            <input
              id="validade"
              value={expirationDisplay}
              oninput={onExpirationInput}
              type="text"
              inputmode="numeric"
              placeholder="MM/AA"
              maxlength="5"
              autocomplete="cc-exp"
              required
            />
          </div>
          <div class="campo campo-cvv">
            <label for="cvv">CVV</label>
            <div class="input-icon">
              <input
                id="cvv"
                value={securityCode}
                oninput={onCVVInput}
                type="text"
                inputmode="numeric"
                placeholder="•••"
                maxlength="4"
                autocomplete="cc-csc"
                required
              />
              <span class="icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </span>
            </div>
          </div>
        </div>

        <div class="row-2">
          <div class="campo">
            <label for="valor">Valor</label>
            <div class="input-prefix-wrap">
              <span class="input-prefix">R$</span>
              <input
                id="valor"
                value={amountDisplay}
                oninput={onAmountInput}
                type="text"
                inputmode="numeric"
                placeholder="0,00"
                required
                class="input-com-prefix"
              />
            </div>
          </div>

          {#if kind === "credit"}
            <div class="campo">
              <label for="parcelas">Parcelas</label>
              <select
                id="parcelas"
                value={installments}
                onchange={onInstallmentsChange}
                disabled={isRecorrente}
                title={isRecorrente ? "Desative a recorrência para parcelar" : ""}
              >
                {#each opcoesParcelamento as op}
                  <option value={op.value}>{op.label}</option>
                {/each}
              </select>
              {#if isRecorrente}
                <span class="campo-hint">Indisponível com recorrência ativa</span>
              {/if}
            </div>
          {/if}
        </div>

        <!-- Recorrência — só crédito -->
        {#if kind === "credit"}
          <div class="recorrencia-row">
            <div class="recorrencia-row-left">
              <span class="recorrencia-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                </svg>
              </span>
              <span>Cobrança recorrente</span>
            </div>
            <label class="toggle-label">
              <input type="checkbox" checked={isRecorrente} onchange={onRecorrenteChange} />
              <span class="toggle-slider"></span>
            </label>
          </div>

          {#if isRecorrente}
            <div class="recorrencia-box">
              <div class="row-2">
                <div class="campo">
                  <label for="freq">Frequência</label>
                  <select id="freq" value={frequencia} onchange={onFrequenciaChange}>
                    <option value="Daily">Diária</option>
                    <option value="Weekly">Semanal</option>
                    <option value="Monthly">Mensal</option>
                    <option value="Yearly">Anual</option>
                  </select>
                </div>
                <div class="campo">
                  <label for="total">Nº de cobranças</label>
                  <input
                    id="total"
                    value={totalCobrancas}
                    oninput={onTotalCobrancasInput}
                    type="number"
                    min="1"
                    max="99"
                    placeholder="12"
                  />
                </div>
              </div>
              <p class="recorrencia-info">
                💡 Será cobrado <strong>R$ {amountDisplay || '0,00'}</strong> a cada
                <strong>{frequencia === "Daily" ? "dia" : frequencia === "Weekly" ? "semana" : frequencia === "Monthly" ? "mês" : "ano"}</strong>,
                por <strong>{totalCobrancas} cobranças</strong>.
              </p>
            </div>
          {/if}
        {/if}

        <!-- Captura automática -->
        <div class="captura-row">
          <label class="check-label">
            <input type="checkbox" checked={capture} onchange={onCaptureChange} />
            <span>Capturar automaticamente</span>
          </label>
        </div>

        <!-- Sandbox helper -->
        <button
          type="button"
          class="btn-sandbox"
          onclick={preencherTeste}
        >
          ⚡ Preencher com dados de teste
        </button>

        <button type="submit" class="btn-pagar" disabled={loading}>
          {#if loading}
            <span class="spinner"></span> Processando...
          {:else}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Pagar agora
          {/if}
        </button>

        <div class="rodape-ssl">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Transação criptografada via SSL. Dados protegidos.
        </div>

      </form>
    {/if}

    <!-- Tela de confirmação -->
    {#if showConfirmationScreen}
      <div class="confirmation-screen">
        <div class="confirmation-icon {resultado ? 'success' : 'failure'}">
          {#if resultado}
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          {:else}
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          {/if}
        </div>

        <div class="confirmation-message">
          {resultado ? "Pagamento aprovado" : "Pagamento negado"}
        </div>

        {#if resultado}
          <div class="confirmation-valor">
            R$ {(resultado.amount / 100).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
          </div>
          {#if bandeira && logoBandeira[bandeira]}
            <div class="confirmation-bandeira">
              {@html logoBandeira[bandeira]}
              <span class="confirmation-card-final">•••• {resultado.last4}</span>
            </div>
          {:else}
            <div class="confirmation-card-info">Cartão •••• {resultado.last4}</div>
          {/if}
        {:else if erro}
          <div class="confirmation-erro-msg">{erro}</div>
        {/if}

        <button type="button" class="btn-details" onclick={() => showDetails = !showDetails}>
          Detalhes
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class:rotate={showDetails}>
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>

        {#if showDetails}
          <div class="resultado-detalhes expanded">
            {#if resultado}
              <div class="detalhe"><span>TID</span><strong>{resultado.tid}</strong></div>
              <div class="detalhe"><span>NSU</span><strong>{resultado.nsu}</strong></div>
              <div class="detalhe"><span>Autorização</span><strong>{resultado.authorizationCode}</strong></div>
              <div class="detalhe"><span>Valor</span><strong>R$ {(resultado.amount / 100).toFixed(2).replace(".", ",")}</strong></div>
              <div class="detalhe"><span>Cartão</span><strong>•••• {resultado.last4}</strong></div>
            {:else if erro}
              <div class="detalhe full-width"><span>Erro</span><strong>{erro}</strong></div>
            {/if}
          </div>
        {/if}

        <div class="confirmation-actions">
          {#if !resultado && tentativas < 3}
            <button
              type="button"
              class="btn-retry"
              onclick={tentarNovamente}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
              </svg>
              Tentar novamente ({3 - tentativas} restante{3 - tentativas !== 1 ? 's' : ''})
            </button>
          {/if}

          <button
            type="button"
            class="btn-continuar"
            onclick={() => {
              showConfirmationScreen = false;
              resultado = null;
              erro = null;
              showDetails = false;
              tentativas = 0;
            }}
          >
            {resultado ? "Concluir" : "Voltar ao formulário"}
          </button>
        </div>
      </div>
    {/if}

  </div>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  :global(body) {
    margin: 0;
    background: #e5e7eb;
    min-height: 100vh;
    font-family: 'Inter', sans-serif;
  }

  .page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem 1rem;
    background: #d1d5db;
  }

  .card {
    background: #ffffff;
    border-radius: 16px;
    padding: 1.5rem;
    width: 100%;
    max-width: 420px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.12);
  }

  /* Header */
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.25rem;
  }
  .logo {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-weight: 600;
    font-size: 0.95rem;
    color: #111827;
  }
  .logo-icon {
    background: #0ea5e9;
    width: 34px;
    height: 34px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .seguro-badge {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.78rem;
    color: #6b7280;
    font-weight: 500;
  }

  /* Tabs */
  .tipo-tabs {
    display: flex;
    border: 1.5px solid #e5e7eb;
    border-radius: 10px;
    overflow: hidden;
    margin-bottom: 1.25rem;
  }
  .tab {
    flex: 1;
    padding: 0.55rem 0.5rem;
    border: none;
    background: transparent;
    font-size: 0.875rem;
    font-weight: 500;
    color: #6b7280;
    cursor: pointer;
    transition: all 0.15s;
    font-family: 'Inter', sans-serif;
  }
  .tab:not(:last-child) {
    border-right: 1.5px solid #e5e7eb;
  }
  .tab.ativo {
    background: #0ea5e9;
    color: white;
    font-weight: 600;
  }

  /* Total box */
 .total-box {
  background: #f9fafb;
  border: 1.5px solid #f3f4f6;
  border-radius: 10px;
  padding: 0.9rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
   align-items: center;
  margin-bottom: 1.25rem;
  gap: 0.5rem;
  flex-wrap: nowrap;
}
  .total-label {
    font-size: 0.65rem;
    font-weight: 600;
    color: #9ca3af;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 0.2rem;
  }
  .total-left {
  flex-shrink: 0;
  min-width: 0;
}
 .total-valor {
  font-size: 1.15rem;   /* era 1.35rem */
  font-weight: 700;
  color: #111827;
  line-height: 1;
  white-space: nowrap;
}
  .total-right {
  text-align: right;
  flex-shrink: 0;
  max-width: 55%;
}
  .total-cartao-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  flex-wrap: nowrap;
}
  .total-cartao {
  font-size: 0.68rem;  /* era 0.72rem */
  color: #374151;
  font-family: monospace;
  letter-spacing: 0.03em;  /* era 0.05em */
  font-weight: 500;
  white-space: nowrap;
}
  .bandeira-logo {
    display: flex;
    align-items: center;
    line-height: 1;
    flex-shrink: 0;
  }

  /* Campos */
  .campo {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    margin-bottom: 0.875rem;
  }
  .campo label {
    font-size: 0.72rem;
    font-weight: 600;
    color: #374151;
    text-transform: uppercase;
    letter-spacing: 0.07em;
  }
  .campo input, .campo select {
    padding: 0.6rem 0.85rem;
    border: 1.5px solid #e5e7eb;
    border-radius: 8px;
    font-size: 0.9rem;
    font-family: 'Inter', sans-serif;
    color: #111827;
    background: white;
    transition: border-color 0.15s, box-shadow 0.15s;
    outline: none;
    width: 100%;
    box-sizing: border-box;
  }
  .campo input::placeholder {
    color: #9ca3af;
  }
  .campo input:focus, .campo select:focus {
    border-color: #0ea5e9;
    box-shadow: 0 0 0 3px rgba(14,165,233,0.12);
  }
  .campo select:disabled {
    background: #f3f4f6;
    color: #9ca3af;
    cursor: not-allowed;
    opacity: 1;
  }
  .campo-hint {
    font-size: 0.7rem;
    color: #f59e0b;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 3px;
  }
  .campo-hint::before {
    content: "⚠";
    font-size: 0.65rem;
  }

  /* Prefixo R$ fixo */
  .input-prefix-wrap {
    display: flex;
    align-items: center;
    border: 1.5px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
    transition: border-color 0.15s, box-shadow 0.15s;
    background: white;
  }
  .input-prefix-wrap:focus-within {
    border-color: #0ea5e9;
    box-shadow: 0 0 0 3px rgba(14,165,233,0.12);
  }
  .input-prefix {
    padding: 0.6rem 0.6rem 0.6rem 0.85rem;
    font-size: 0.9rem;
    font-weight: 600;
    color: #6b7280;
    background: #f9fafb;
    border-right: 1.5px solid #e5e7eb;
    white-space: nowrap;
    user-select: none;
    line-height: 1;
  }
  .input-com-prefix {
    border: none !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    flex: 1;
    min-width: 0;
    padding: 0.6rem 0.85rem !important;
    outline: none;
    font-size: 0.9rem;
    font-family: 'Inter', sans-serif;
    color: #111827;
    background: white;
    width: 100%;
  }

  .input-icon {
    position: relative;
  }
  .input-icon input {
    padding-right: 2.8rem;
  }
  .input-icon .icon {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: #9ca3af;
    display: flex;
    align-items: center;
    pointer-events: none;
  }
  .icon-bandeira {
    right: 0.6rem;
  }

  /* Linha Valor / Parcelas */
  .row-2 {
    display: flex;
    gap: 0.6rem;
    align-items: flex-start;
  }
  .row-2 .campo {
    flex: 1;
    min-width: 0;
  }

  /* Recorrência row */
  .recorrencia-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border: 1.5px solid #e5e7eb;
    border-radius: 8px;
    padding: 0.7rem 0.9rem;
    margin-bottom: 0.75rem;
  }
  .recorrencia-row-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }
  .recorrencia-icon {
    color: #6b7280;
    display: flex;
    align-items: center;
  }

  /* Toggle */
  .toggle-label {
    display: flex;
    align-items: center;
    cursor: pointer;
  }
  .toggle-label input[type="checkbox"] { display: none; }
  .toggle-slider {
    width: 44px;
    height: 26px;
    background: #d1d5db;
    border-radius: 13px;
    position: relative;
    transition: background 0.2s;
    flex-shrink: 0;
  }
  .toggle-slider::after {
    content: '';
    position: absolute;
    width: 20px;
    height: 20px;
    background: white;
    border-radius: 50%;
    top: 3px;
    left: 3px;
    transition: transform 0.2s;
    box-shadow: 0 1px 4px rgba(0,0,0,0.2);
  }
  .toggle-label input:checked + .toggle-slider { background: #0ea5e9; }
  .toggle-label input:checked + .toggle-slider::after { transform: translateX(18px); }

  /* Recorrência box expandido */
  .recorrencia-box {
    background: #f0f9ff;
    border: 1.5px solid #bae6fd;
    border-radius: 10px;
    padding: 0.875rem;
    margin-bottom: 0.75rem;
  }
  .recorrencia-info {
    font-size: 0.78rem;
    color: #0284c7;
    margin: 0.5rem 0 0;
    line-height: 1.5;
  }

  /* Captura row */
  .captura-row {
    border: 1.5px solid #e5e7eb;
    border-radius: 8px;
    padding: 0.7rem 0.9rem;
    margin-bottom: 0.875rem;
  }
  .check-label {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    cursor: pointer;
  }
  .check-label input[type="checkbox"] {
    width: 16px;
    height: 16px;
    accent-color: #0ea5e9;
    cursor: pointer;
  }

  /* Botões */
  .btn-sandbox {
    width: 100%;
    padding: 0.65rem;
    background: transparent;
    border: 1.5px dashed #d1d5db;
    color: #6b7280;
    border-radius: 8px;
    font-size: 0.82rem;
    font-weight: 500;
    font-family: 'Inter', sans-serif;
    cursor: pointer;
    margin-bottom: 0.75rem;
    transition: background 0.15s, border-color 0.15s;
  }
  .btn-sandbox:hover {
    background: #f9fafb;
    border-color: #9ca3af;
  }

  .btn-pagar {
    width: 100%;
    padding: 0.85rem;
    background: #0ea5e9;
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 0.975rem;
    font-weight: 700;
    font-family: 'Inter', sans-serif;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition: background 0.15s, transform 0.1s;
    letter-spacing: 0.01em;
    margin-bottom: 0.875rem;
  }
  .btn-pagar:hover:not(:disabled) { background: #0284c7; transform: translateY(-1px); }
  .btn-pagar:disabled { opacity: 0.6; cursor: not-allowed; }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255,255,255,0.35);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Rodapé SSL */
  .rodape-ssl {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    font-size: 0.72rem;
    color: #9ca3af;
    text-align: center;
  }

  /* Tela de confirmação */
  .confirmation-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem 1rem;
    text-align: center;
  }

  .confirmation-icon {
    margin-bottom: 1.5rem;
    width: 80px;
    height: 80px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .confirmation-icon.success { background: #ecfdf5; }
  .confirmation-icon.failure { background: #fef2f2; }

  .confirmation-message {
    font-size: 1.75rem;
    font-weight: 700;
    color: #111827;
    margin-bottom: 0.5rem;
  }

  .confirmation-valor {
    font-size: 1.6rem;
    font-weight: 700;
    color: #16a34a;
    letter-spacing: -0.01em;
    margin-bottom: 0.5rem;
    line-height: 1;
  }

  .confirmation-bandeira {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 1.25rem;
    justify-content: center;
  }
  .confirmation-card-final {
    font-size: 0.85rem;
    color: #6b7280;
    font-family: monospace;
    letter-spacing: 0.08em;
  }
  .confirmation-card-info {
    font-size: 0.85rem;
    color: #6b7280;
    margin-bottom: 1.25rem;
    font-family: monospace;
  }

  .confirmation-erro-msg {
    font-size: 0.875rem;
    color: #dc2626;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    padding: 0.6rem 1rem;
    margin-bottom: 1rem;
    max-width: 100%;
    word-break: break-word;
    text-align: left;
  }

  .btn-details {
    background: none;
    border: none;
    color: #0ea5e9;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-bottom: 1rem;
    font-family: 'Inter', sans-serif;
    transition: color 0.2s;
  }
  .btn-details:hover { color: #0284c7; }
  .btn-details svg { transition: transform 0.2s; }
  .btn-details svg.rotate { transform: rotate(180deg); }

  .resultado-detalhes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.4rem;
  }
  .resultado-detalhes.expanded {
    width: 100%;
    margin-bottom: 1.5rem;
  }

  .detalhe {
    background: #f9fafb;
    border-radius: 7px;
    padding: 0.45rem 0.7rem;
    border: 1px solid #e5e7eb;
  }
  .detalhe span {
    display: block;
    font-size: 0.65rem;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.1rem;
  }
  .detalhe strong {
    font-size: 0.78rem;
    color: #111827;
    word-break: break-all;
  }
  .detalhe.full-width {
    grid-column: span 2;
  }

  /* Ações na confirmação */
  .confirmation-actions {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .btn-retry {
    width: 100%;
    padding: 0.75rem;
    background: white;
    color: #0ea5e9;
    border: 1.5px solid #0ea5e9;
    border-radius: 10px;
    font-size: 0.9rem;
    font-weight: 600;
    font-family: 'Inter', sans-serif;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition: background 0.15s, color 0.15s;
  }
  .btn-retry:hover {
    background: #f0f9ff;
  }

  .btn-continuar {
    width: 100%;
    padding: 0.85rem;
    background: #0ea5e9;
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 0.975rem;
    font-weight: 700;
    font-family: 'Inter', sans-serif;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
    letter-spacing: 0.01em;
  }
  .btn-continuar:hover { background: #0284c7; transform: translateY(-1px); }
</style>