/**
 * @param {any} payload
 */
 export async function criarTransacao(payload) {
    const response = await fetch("/api/pagar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.returnMessage || "Erro na transação");
    }

  return data;
}