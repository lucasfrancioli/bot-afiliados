# Sistema de Automação de Afiliados — Mercado Livre & Shopee
### Documento Técnico de Arquitetura

---

## 1. Visão Geral

Sistema que, em horários programados, busca automaticamente ofertas de produtos para casa no Mercado Livre e na Shopee, converte os links para versão de afiliado, gera imagem promocional via IA, monta a mensagem de divulgação e publica em um grupo do WhatsApp — tudo com acompanhamento visual em tempo real via painel web.

### Pipeline (etapas do fluxo)

```
[1] Busca de Ofertas
      ↓
[2] Filtro e Seleção (nota, desconto, selo "oferta imperdível")
      ↓
[3] Conversão de Link de Afiliado
      ↓
[4] Geração de Imagem (Nano Banana / Gemini Image)
      ↓
[5] Geração da Mensagem (copy de venda via IA)
      ↓
[6] Envio no WhatsApp (com delay anti-bloqueio)
      ↓
[7] Log e Registro (evita repetição do mesmo produto)
```

Cada etapa acima corresponde a um "card" no painel visual, com status: **pendente (cinza)** → **em execução (amarelo)** → **concluído (verde)** → **erro (vermelho)**.

---

## 2. Critérios de Seleção de Produtos

- Nicho fixo: **produtos para casa**
- Selo "Oferta Imperdível" / desconto mínimo configurável (ex: ≥ 30%)
- Nota de avaliação mínima (ex: ≥ 4.3)
- Quantidade mínima de vendas/avaliações (evita produtos "baratos mas suspeitos")
- Controle de duplicidade: produto não pode repetir em X dias (configurável)
- Configuração de quantos produtos buscar por plataforma a cada disparo (ex: 3 ML + 3 Shopee)

Esses critérios ficam configuráveis no painel, sem precisar mexer em código.

---

## 3. Integrações por Plataforma

### Mercado Livre
- Possui **API oficial de afiliados** — viável de integrar de forma automatizada.
- Fluxo: buscar produto → gerar link curto de afiliado via API → armazenar.
- Requer cadastro no programa de afiliados do Mercado Livre e geração de credenciais (client_id/secret).

### Shopee
- O programa de afiliados da Shopee **não tem API pública robusta e aberta** como o ML; costuma depender do **Shopee Affiliate/Involve Asia/portal próprio**, com termos que restringem automação de captura de links e scraping.
- Recomendação: começar essa parte de forma **semi-automatizada** (você confirma manualmente a lista de produtos e o sistema só formata/agenda), e revisar depois se compensa investir em automação mais profunda — o risco aqui é ter a conta suspensa por uso fora dos termos.

---

## 4. Geração de Imagem

- Integração com API de geração de imagem (Nano Banana / Gemini Image) para criar a arte promocional a partir da foto do produto + template de layout (preço, desconto, selo).
- Template padronizado (mesma identidade visual do grupo) com variáveis: título do produto, preço antigo, preço novo, % desconto.

## 5. Geração da Mensagem

- IA gera o texto da publicação com: gancho de urgência, nome do produto, preço, % de desconto, link de afiliado, CTA.
- Variação de frases para não repetir sempre o mesmo padrão (reduz aparência robótica).

---

## 6. Envio via WhatsApp Web

- Conexão persistente via **whatsapp-web.js** (biblioteca que controla o WhatsApp Web por trás de um navegador headless).
- **Delay de 30–40s entre mensagens**, com pequena variação aleatória (ex: 28–45s) para reduzir padrão robótico.
- Fila de envio: se o horário programado tiver várias ofertas, elas são enviadas uma a uma, respeitando o delay.

**Ponto de atenção importante:** automatizar o WhatsApp Web dessa forma vai contra os Termos de Uso do WhatsApp, que proíbem automação não-oficial. Na prática, contas usadas assim correm risco de bloqueio, principalmente se o volume de mensagens crescer ou o número for novo. Vale usar um número dedicado (não o pessoal) e ter isso como risco assumido do projeto — não é possível eliminar esse risco totalmente, só reduzi-lo.

---

## 7. Painel de Acompanhamento (Web)

Como você definiu que será **acessível via navegador**, a estrutura fica assim:

- **Backend** expõe o estado do pipeline em tempo real via **WebSocket**.
- **Frontend web** (acessível de qualquer computador/celular na rede ou via deploy) mostra:
  - Lista de execuções (histórico de disparos)
  - Status colorido de cada etapa do pipeline atual
  - Log de erros por etapa (clicável, pra ver detalhe do erro)
  - Configurações: horários, critérios de busca, nicho, número de produtos por disparo
  - Preview da imagem e mensagem antes do envio (com opção de aprovar manualmente, se você quiser essa trava de segurança)

---

## 8. Stack Técnica Recomendada

| Camada | Tecnologia | Motivo |
|---|---|---|
| Backend/orquestração | **Node.js + TypeScript** | Ecossistema maduro para WhatsApp Web (whatsapp-web.js) e APIs assíncronas |
| Agendamento | **node-cron** | Simples, confiável para horários fixos |
| Banco de dados | **PostgreSQL** (ou SQLite se for uso local simples) | Histórico de produtos enviados, logs, configurações |
| Comunicação tempo real | **Socket.io** | Atualização ao vivo do status no painel |
| Frontend/Painel | **React + Vite** | Painel web leve e responsivo |
| WhatsApp | **whatsapp-web.js** | Biblioteca mais usada para esse tipo de automação não-oficial |
| Geração de imagem | **API Nano Banana (Gemini Image)** | Já definida por você |
| Hospedagem | **VPS simples (ex: 2 vCPU/4GB)** | Precisa rodar o navegador headless do WhatsApp 24/7 |

---

## 9. Estrutura de Pastas

```
bot-afiliados/
├── backend/
│   ├── src/
│   │   ├── scrapers/          # busca ML e Shopee
│   │   ├── affiliate/         # conversão de links
│   │   ├── image-gen/         # integração Nano Banana
│   │   ├── message-gen/       # geração de copy
│   │   ├── whatsapp/          # cliente whatsapp-web.js
│   │   ├── scheduler/         # cron jobs
│   │   ├── pipeline/          # orquestração das etapas + emissão de status via socket
│   │   ├── db/                # models e migrations
│   │   └── server.ts
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/        # cards de status, configurações
│   │   ├── pages/
│   │   └── App.tsx
│   └── package.json
└── docker-compose.yml         # sobe backend + banco juntos
```

---

## 10. Fases de Desenvolvimento

1. **Fase 1 — Núcleo Mercado Livre:** busca de ofertas + conversão de link de afiliado (API oficial) funcionando isoladamente, testado via linha de comando. ✅ em andamento
2. **Fase 2 — Geração de conteúdo:** integração da imagem (Nano Banana) e da mensagem, ainda sem enviar nada, só gerando os dois.
3. **Fase 3 — WhatsApp:** conexão do whatsapp-web.js, envio manual disparado por você, testando o delay.
4. **Fase 4 — Agendamento:** liga o cron aos horários definidos, primeira versão end-to-end funcionando.
5. **Fase 5 — Painel web:** dashboard com status em tempo real, configurações editáveis.
6. **Fase 6 — Shopee (semi-automatizada):** adiciona a segunda plataforma com o modelo mais manual descrito acima.
