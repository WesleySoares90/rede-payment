<script>
  import { criarTransacao } from "$lib/api-rede.js";

  let kind = $state("credit");
  let cardholderName = $state("");
  let cardNumber = $state("");
  let expirationMonth = $state("");
  let expirationYear = $state("");
  let securityCode = $state("");
  let amount = $state("");
  let installments = $state(1);
  let capture = $state(true);
  let loading = $state(false);
  let resultado = $state(null);
  let erro = $state(null);

  // Recorrência
  let isRecorrente = $state(false);
  let frequencia = $state("Monthly");
  let totalCobrancas = $state(12);

  const cartoesTeste = {
    credit:  "4235647728025682",
    debit:   "4761120000000148",
    voucher: "4389357063526690"
  };

  function formatarCartao(value) {
    return value.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim().slice(0, 19);
  }

 async function pagar() {
  loading = true;
  try {
    // Enviamos apenas os dados brutos
    const dadosParaOBackend = {
      kind,
      amount: parseFloat(amount), // Valor em reais (ex: 200.00)
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
    };

    resultado = await criarTransacao(dadosParaOBackend);
  } catch (e) {
    erro = e.message;
  } finally {
    loading = false;
  }
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
        <div class="total-valor">R$ {amount ? parseFloat(amount).toFixed(2).replace('.', ',') : '0,00'}</div>
      </div>
      <div class="total-right">
        <div class="total-label">CARTÃO</div>
        <div class="total-cartao">{cardNumber || "•••• •••• •••• ••••"}</div>
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
            oninput={(e) => cardNumber = formatarCartao(e.target.value)}
            placeholder="0000 0000 0000 0000"
            maxlength="19"
            required
          />
          <span class="icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
              <line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
          </span>
        </div>
      </div>

      <div class="campo">
        <label for="nome">Nome no cartão</label>
        <input
          id="nome"
          bind:value={cardholderName}
          placeholder="Como escrito no cartão"
          required
        />
      </div>

      <div class="row-3">
        <div class="campo campo-small">
          <label for="mes">Mês</label>
          <input id="mes" bind:value={expirationMonth} placeholder="MM" maxlength="2" required />
        </div>
        <div class="campo campo-small">
          <label for="ano">Ano</label>
          <input id="ano" bind:value={expirationYear} placeholder="AAAA" maxlength="4" required />
        </div>
        <div class="campo">
          <label for="cvv">CVV</label>
          <div class="input-icon">
            <input id="cvv" bind:value={securityCode} placeholder="•••" maxlength="4" required />
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
          <label for="valor">Valor (R$)</label>
          <input
            id="valor"
            bind:value={amount}
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0,00"
            required
          />
        </div>

        {#if kind === "credit"}
          <div class="campo">
            <label for="parcelas">Parcelas</label>
            <select id="parcelas" bind:value={installments}>
              {#each Array(12) as _, i}
                <option value={i + 1}>{i + 1}x sem juros</option>
              {/each}
            </select>
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
            <input type="checkbox" bind:checked={isRecorrente} />
            <span class="toggle-slider"></span>
          </label>
        </div>

        {#if isRecorrente}
          <div class="recorrencia-box">
            <div class="row-2">
              <div class="campo">
                <label for="freq">Frequência</label>
                <select id="freq" bind:value={frequencia}>
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
                  bind:value={totalCobrancas}
                  type="number"
                  min="1"
                  max="99"
                  placeholder="12"
                />
              </div>
            </div>
            <p class="recorrencia-info">
              💡 Será cobrado <strong>R$ {amount || "0,00"}</strong> a cada
              <strong>{frequencia === "Daily" ? "dia" : frequencia === "Weekly" ? "semana" : frequencia === "Monthly" ? "mês" : "ano"}</strong>,
              por <strong>{totalCobrancas} cobranças</strong>.
            </p>
          </div>
        {/if}
      {/if}

      <!-- Captura automática -->
      <div class="captura-row">
        <label class="check-label">
          <input type="checkbox" bind:checked={capture} />
          <span>Capturar automaticamente</span>
        </label>
      </div>

      <!-- Sandbox helper -->
      <button
        type="button"
        class="btn-sandbox"
        onclick={() => {
          cardNumber = cartoesTeste[kind];
          expirationMonth = "01";
          expirationYear = "2035";
          securityCode = "123";
          cardholderName = "JOAO DA SILVA";
        }}
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

    <!-- Resultado -->
    {#if resultado}
      <div class="resultado sucesso">
        <div class="resultado-header">
          <span class="resultado-icon">✅</span>
          <div>
            <strong>{resultado.returnMessage}</strong>
            <span class="resultado-code">Código {resultado.returnCode}</span>
          </div>
        </div>
        <div class="resultado-detalhes">
          <div class="detalhe"><span>TID</span><strong>{resultado.tid}</strong></div>
          <div class="detalhe"><span>NSU</span><strong>{resultado.nsu}</strong></div>
          <div class="detalhe"><span>Autorização</span><strong>{resultado.authorizationCode}</strong></div>
          <div class="detalhe"><span>Valor</span><strong>R$ {(resultado.amount / 100).toFixed(2)}</strong></div>
          <div class="detalhe"><span>Cartão</span><strong>•••• {resultado.last4}</strong></div>
        </div>
      </div>
    {/if}

    {#if erro}
      <div class="resultado erro">
        <span class="resultado-icon">❌</span>
        <span>{erro}</span>
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
    align-items: flex-end;
    margin-bottom: 1.25rem;
  }
  .total-label {
    font-size: 0.65rem;
    font-weight: 600;
    color: #9ca3af;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 0.2rem;
  }
  .total-valor {
    font-size: 1.35rem;
    font-weight: 700;
    color: #111827;
    line-height: 1;
  }
  .total-right {
    text-align: right;
  }
  .total-cartao {
    font-size: 0.8rem;
    color: #374151;
    font-family: monospace;
    letter-spacing: 0.12em;
    font-weight: 500;
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
  }
  .campo input::placeholder {
    color: #9ca3af;
  }
  .campo input:focus, .campo select:focus {
    border-color: #0ea5e9;
    box-shadow: 0 0 0 3px rgba(14,165,233,0.12);
  }

  .input-icon {
    position: relative;
  }
  .input-icon input {
    width: 100%;
    padding-right: 2.5rem;
    box-sizing: border-box;
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

  .row-3 { display: flex; gap: 0.6rem; }
  .row-3 .campo { flex: 1; }
 .row-3 .campo-small {
  flex:  0.25px !important;
  width: 60px;
}
  .row-2 { display: flex; gap: 0.6rem; }
  .row-2 .campo {flex:  0.25px !important;
  width: 60px; }

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

  /* Resultado */
  .resultado {
    margin-top: 1.25rem;
    border-radius: 10px;
    padding: 1rem;
  }
  .resultado.sucesso {
    background: #f0fdf4;
    border: 1.5px solid #bbf7d0;
  }
  .resultado.erro {
    background: #fef2f2;
    border: 1.5px solid #fecaca;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #dc2626;
    font-size: 0.875rem;
  }
  .resultado-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }
  .resultado-icon { font-size: 1.4rem; }
  .resultado-header strong { display: block; color: #15803d; font-size: 0.9rem; }
  .resultado-code { font-size: 0.72rem; color: #86efac; }
  .resultado-detalhes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.4rem;
  }
  .detalhe {
    background: white;
    border-radius: 7px;
    padding: 0.45rem 0.7rem;
    border: 1px solid #dcfce7;
  }
  .detalhe span {
    display: block;
    font-size: 0.65rem;
    color: #86efac;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.1rem;
  }
  .detalhe strong {
    font-size: 0.78rem;
    color: #15803d;
    word-break: break-all;
  }
</style>
