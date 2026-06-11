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

    const data = await response.json();

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