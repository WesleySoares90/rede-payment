import { json } from '@sveltejs/kit';


const BASIC_TOKEN = "NzgyMDM0NDY6ZmRlZGFhZmZkYmZlNGRmZjk5NDVmYjFjNWY5ZWY3NGI=";
const TOKEN_URL = "https://rl7-sandbox-api.useredecloud.com.br/oauth2/token";
const BASE_URL = "https://sandbox-erede.useredecloud.com.br/v2/transactions";

async function getAccessToken() {
    const res = await fetch(TOKEN_URL, {
        method: "POST",
        headers: {
            "Authorization": `Basic ${BASIC_TOKEN}`,
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "grant_type=client_credentials"
    });

    const text = await res.text();

    if (!res.ok) {
        console.error("ERRO AO OBTER TOKEN. Status:", res.status, "Corpo:", text.slice(0, 300));
        throw new Error(`Erro ao obter token (status ${res.status}): ${text.slice(0, 200)}`);
    }

    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        console.error("Resposta do TOKEN_URL não é JSON. Corpo:", text.slice(0, 300));
        throw new Error("Resposta inválida do servidor de autenticação (não é JSON).");
    }

    if (!data.access_token) {
        throw new Error("Token de acesso não retornado pela API de autenticação.");
    }

    return data.access_token;
}

function formatarExpiracao(minutosAPartirDeAgora) {
    const data = new Date(Date.now() + minutosAPartirDeAgora * 60 * 1000);
    const pad = (n) => String(n).padStart(2, "0");

    return (
        data.getFullYear() + "-" +
        pad(data.getMonth() + 1) + "-" +
        pad(data.getDate()) + "T" +
        pad(data.getHours()) + ":" +
        pad(data.getMinutes()) + ":" +
        pad(data.getSeconds())
    );
}

// Tempo de expiração do QR Code: 30 minutos a partir de agora
const QRCODE_EXPIRATION_MINUTES = 30;

export async function POST({ request }) {
    try {
        const rawData = await request.json(); // Dados do frontend ({ amount })

        if (!rawData.amount || rawData.amount <= 0) {
            return json({ returnMessage: "Valor inválido para gerar o Pix." }, { status: 400 });
        }

        const reference = `REF-${Date.now()}`;

        const payloadRede = {
            kind: "Pix",
            reference,
            orderId: reference,
            amount: Math.round(rawData.amount * 100), // centavos, sem separador
            qrCode: {
                dateTimeExpiration: formatarExpiracao(QRCODE_EXPIRATION_MINUTES)
            }
        };

        const token = await getAccessToken();

        console.log("PAYLOAD PIX ENVIADO PARA A REDE:", JSON.stringify(payloadRede));

        const res = await fetch(BASE_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payloadRede)
        });

        const text = await res.text();
        console.log("REDE PIX RESPONSE STATUS:", res.status);
        console.log("REDE PIX RESPONSE BODY:", text.slice(0, 500));

        let data;
        try {
            data = text ? JSON.parse(text) : { returnMessage: "Resposta vazia da API" };
        } catch (e) {
            console.error("RESPOSTA DA REDE NÃO É JSON:", text.slice(0, 500));
            return json(
                {
                    returnMessage: `A API da Rede retornou uma resposta inesperada (status ${res.status}). Verifique a URL/ambiente.`
                },
                { status: 502 }
            );
        }

        return json(data, { status: res.status });

    } catch (e) {
        console.error("ERRO NO PROCESSAMENTO DO PIX:", e.message);
        return json({ returnMessage: e.message }, { status: 500 });
    }
}
