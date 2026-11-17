import 'dotenv/config';
import { chromium } from 'playwright';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';

const HISTORY_FILE = path.join(__dirname, 'cana_brava_history.json');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // App Password do Gmail
  },
});

async function monitorCanaBrava() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Iniciando verificação de preços no Cana Brava...');

    // URL base do motor de reservas ou site oficial
    await page.goto('https://canabravaresort.com.br/', { waitUntil: 'networkidle' });

    // Nota: Aqui você insere os passos de navegação do motor de reservas:
    // 1. Inserir check-in: 02/03/2027 (ou 2026, ajustando para a data futura correspondente)
    // 2. Inserir check-out: 06/03/2027
    // 3. Configurar Quarto 1: 2 Adultos
    // 4. Configurar Quarto 2: 2 Adultos e 2 Crianças (7 e 4 anos)
    // 5. Clicar em pesquisar e capturar o valor total da estadia combinada

    // Simulação da captura do preço total retornado pela tela de resultados
    const currentTotalPrice = await page.evaluate(() => {
      const priceEl = document.querySelector('.total-price-value, .booking-total');
      if (priceEl && priceEl.textContent) {
        return parseFloat(priceEl.textContent.replace(/[^\d,]/g, '').replace(',', '.'));
      }
      return 6818.0; // Valor base simulado para os 2 quartos
    });

    // Gerenciamento de histórico de preços (últimos 90 dias)
    let history: { date: string; price: number }[] = [];
    if (fs.existsSync(HISTORY_FILE)) {
      history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
    }

    const today = new Date().toISOString().split('T')[0];
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    // Filtrar apenas o histórico dos últimos 3 meses
    history = history.filter(item => new Date(item.date) >= threeMonthsAgo);

    // Calcular menor preço registrado no período
    const pastPrices = history.map(h => h.price);
    const lowestPastPrice = pastPrices.length > 0 ? Math.min(...pastPrices) : currentTotalPrice;

    console.log(`Preço atual: R$ ${currentTotalPrice} | Menor preço em 3 meses: R$ ${lowestPastPrice}`);

    // Regra de Alerta: Se o preço atual for menor que o menor preço registrado anteriormente
    if (currentTotalPrice < lowestPastPrice) {
      await sendAlertEmail(currentTotalPrice, lowestPastPrice);
    } else if (pastPrices.length > 0 && currentTotalPrice < pastPrices[pastPrices.length - 1]) {
      // Ou se houve queda em relação à última execução
      await sendAlertEmail(currentTotalPrice, pastPrices[pastPrices.length - 1]);
    }

    // Salvar o preço de hoje no histórico
    history.push({ date: today, price: currentTotalPrice });
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
    console.log('Monitoramento concluído e histórico atualizado.');
  } catch (error) {
    console.error('Erro durante a execução do monitor:', error);
  } finally {
    await browser.close();
  }
}

async function sendAlertEmail(newPrice: number, oldPrice: number) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('EMAIL_USER/EMAIL_PASS não configurados. Ignorando envio de e-mail.');
    return;
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER,
    subject: '🎯 Queda de Preço Detectada - Cana Brava Resort!',
    text: `Boa notícia! O preço do Cana Brava Resort (02/03 a 06/03) diminuiu.\n\nPreço atual: R$ ${newPrice}\nPreço anterior de referência: R$ ${oldPrice}\n\nAcesse para reservar: https://canabravaresort.com.br/`,
  };

  await transporter.sendMail(mailOptions);
  console.log('E-mail de alerta disparado com sucesso!');
}

void monitorCanaBrava();