# check_price

Script para monitorar o preço de estadia do Cana Brava Resort e enviar um e-mail quando houver queda.

## Requisitos

- Node.js 24+
- Dependências do projeto
- Variáveis de ambiente Gmail:
  - `EMAIL_USER`
  - `EMAIL_PASS` (use uma senha de app do Gmail)

## Instalação

```bash
npm install
cp .env.example .env
# ajuste as variáveis no arquivo .env
```

## Execução

```bash
npm start
```

## Execução diária no GitHub Actions

O workflow `.github/workflows/daily_check.yml` executa o script todos os dias às 08:00 (horário de Brasília). Para ativá-lo:

1. Envie este repositório para o GitHub e, nas configurações do repositório, adicione `EMAIL_USER` e `EMAIL_PASS` em **Settings → Secrets and variables → Actions → New repository secret**. Use uma senha de app do Gmail em `EMAIL_PASS`.
2. Deixe o workflow na branch padrão do repositório. O GitHub executa agendamentos a partir dessa branch.
3. Para testar sem esperar, abra **Actions → Daily Cana Brava Price Check → Run workflow**.

O histórico de preços é preservado entre execuções pelo cache do GitHub Actions. A agenda usa UTC; o comentário no workflow indica o horário local correspondente.

## Observações

- O site pode alterar a estrutura HTML ou exigir interação manual na página.
- O script usa Playwright para abrir o site e tentar extrair o valor total.
- Se o seletor CSS do preço mudar, ajuste o `querySelector` em `script.ts`.
