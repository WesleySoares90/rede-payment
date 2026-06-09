

import { json } from '@sveltejs/kit';

// Credenciais da API

const BASIC_TOKEN = "NzgyMDM0NDY6ZmRlZGFhZmZkYmZlNGRmZjk5NDVmYjFjNWY5ZWY3NGI=";
const AFFILIATION = "78203446";
const TOKEN_URL = "https://rl7-sandbox-api.useredecloud.com.br/oauth2/token";
const BASE_URL = "https://sandbox-erede.useredecloud.com.br/v2/transactions";


 // Obtém o token  da Rede
async function getAccessToken() {
    const res = await fetch(TOKEN_URL, {
        method: "POST",
        headers: {
            "Authorization": `Basic ${BASIC_TOKEN}`,
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "grant_type=client_credentials"
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error("Erro ao obter token: " + text);
    }

    const data = await res.json();
    return data.access_token;
}

// processar o pagamento
export async function POST({ request }) {
    try {
        const rawData = await request.json(); // Dados frontend
        const token = await getAccessToken();

        const payloadRede = {
            capture: rawData.capture,
            kind: rawData.kind,
            reference: `REF-${Date.now()}`,
            amount: Math.round(rawData.amount * 100), // centavos
            cardholderName: rawData.cardholderName,
            cardNumber: rawData.cardNumber,
            expirationMonth: rawData.expirationMonth,
            expirationYear: rawData.expirationYear,
            securityCode: rawData.securityCode,
            softDescriptor: "Minha Loja",
            affiliation: AFFILIATION
        };

        // parcelas e recorrência se for CRÉDITO

        if (rawData.kind === "credit") {
            payloadRede.installments = rawData.installments;

            if (rawData.isRecorrente) {
                payloadRede.subscription = true;
                payloadRede.recurrence = {
                    frequency: rawData.frequencia,
                    numberOfPayments: rawData.totalCobrancas,
                    interval: 1,
                    processingType: "Authorization",
                    firstInstallment: true
                };
            }
        }

        console.log("PAYLOAD ENVIADO PARA A REDE:", JSON.stringify(payloadRede));

        // requisição para a API da Rede
        const res = await fetch(BASE_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payloadRede)
        });

        const text = await res.text();
        console.log("REDE RESPONSE STATUS:", res.status);
        console.log("REDE RESPONSE BODY:", text);

        const data = text ? JSON.parse(text) : { returnMessage: "Resposta vazia da API" };
        
        // resposta da Rede de volta para o frontend
        return json(data, { status: res.status });

    } catch (e) {
        console.error("ERRO NO PROCESSAMENTO:", e.message);
        return json({ returnMessage: e.message }, { status: 500 });
    }
}
