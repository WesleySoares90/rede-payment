/**
 * Lê a resposta do fetch de forma segura.
 * Se o corpo não for JSON válido (ex: página de erro HTML do servidor),
 * lança um erro com uma mensagem legível em vez de estourar
 * "Unexpected token '<', ... is not valid JSON".
 *
 * @param {Response} response
 * @returns {Promise<any>}
 */
async function parseRespostaSegura(response) {
    const texto = await response.text();

    try {
        return JSON.parse(texto);
    } catch (e) {
        console.error("Resposta não é JSON válido. Status:", response.status, "Corpo recebido:", texto.slice(0, 300));

        if (texto.trim().startsWith("<")) {
            throw new Error(
                `O servidor retornou uma página de erro (status ${response.status}) em vez de JSON. ` +
                `Verifique se a rota da API existe e se o servidor de desenvolvimento foi reiniciado.`
            );
        }

        throw new Error(`Resposta inesperada do servidor (status ${response.status}).`);
    }
}

/**
 * Cria uma transação na API
 * @param {any} dadosFormulario
 * @throws {Error}
 */
export async function criarTransacao(dadosFormulario) {
    const response = await fetch("/api/pagar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dadosFormulario)
    });

    const data = await parseRespostaSegura(response);

    if (!response.ok) {
        const mensagens = {
            "58": "Cartão não permitido.",
            "51": "Saldo ou limite insuficiente.",
            "86": "Cartão vencido.",
            "05": "Transação não autorizada.",
        };
        const msg = mensagens[String(data.returnCode)] ?? data.returnMessage ?? "Erro na transação";
        throw new Error(msg);
    }

    return data;
}

/**
 * Cria um QR Code Pix
 * @param {{ amount: number }} dadosFormulario
 * @throws {Error}
 */
export async function criarPix(dadosFormulario) {
    const response = await fetch("/api/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dadosFormulario)
    });

    const data = await parseRespostaSegura(response);

    if (!response.ok) {
        const msg = data.returnMessage ?? "Erro ao gerar o QR Code Pix";
        throw new Error(msg);
    }

    return data;
}
