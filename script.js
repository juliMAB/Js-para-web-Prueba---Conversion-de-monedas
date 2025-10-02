// Configuración de la API
const API_URL = 'https://mindicador.cl/api';

// Mapeo de códigos de moneda a nombres legibles
const currencyNames = {
    'dolar': 'Dólar Americano (USD)',
    'euro': 'Euro (EUR)',
    'uf': 'Unidad de Fomento (UF)',
    'utm': 'Unidad Tributaria Mensual (UTM)',
    'dolar_intercambio': 'Dólar Intercambio'
};

// Elementos del DOM
const converterForm = document.getElementById('converterForm');
const amountInput = document.getElementById('amount');
const currencySelect = document.getElementById('currency');
const convertBtn = document.getElementById('convertBtn');
const loadingDiv = document.getElementById('loading');
const resultDiv = document.getElementById('result');
const errorDiv = document.getElementById('error');

// Elementos del resultado
const originalAmountSpan = document.getElementById('originalAmount');
const targetCurrencySpan = document.getElementById('targetCurrency');
const exchangeRateSpan = document.getElementById('exchangeRate');
const convertedAmountSpan = document.getElementById('convertedAmount');
const updateDateSpan = document.getElementById('updateDate');

// Event listener para el formulario
converterForm.addEventListener('submit', handleConversion);

/**
 * Maneja el envío del formulario de conversión
 * @param {Event} e - Evento del formulario
 */
async function handleConversion(e) {
    e.preventDefault();
    
    const amount = parseFloat(amountInput.value);
    const selectedCurrency = currencySelect.value;
    
    if (!amount || amount <= 0) {
        showError('Por favor, ingresa un monto válido mayor a 0.');
        return;
    }
    
    if (!selectedCurrency) {
        showError('Por favor, selecciona una moneda de destino.');
        return;
    }
    
    await convertCurrency(amount, selectedCurrency);
}

/**
 * Realiza la conversión de moneda consultando la API
 * @param {number} amount - Monto en CLP a convertir
 * @param {string} currency - Código de la moneda destino
 */
async function convertCurrency(amount, currency) {
    showLoading();
    hideError();
    hideResult();
    
    try {
        // Obtener datos de la API
        const response = await fetch(`${API_URL}/${currency}`);
        
        if (!response.ok) {
            throw new Error(`Error en la API: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.serie || data.serie.length === 0) {
            throw new Error('No se encontraron datos para la moneda seleccionada.');
        }
        
        // Obtener el valor más reciente
        const latestValue = data.serie[0];
        const exchangeRate = latestValue.valor;
        const updateDate = new Date(latestValue.fecha).toLocaleDateString('es-CL');
        
        // Calcular la conversión
        const convertedAmount = calculateConversion(amount, exchangeRate, currency);
        
        // Mostrar el resultado
        displayResult(amount, currency, exchangeRate, convertedAmount, updateDate);
        
    } catch (error) {
        console.error('Error en la conversión:', error);
        showError('Error al obtener los datos de conversión. Verifica tu conexión a internet e intenta nuevamente.');
    } finally {
        hideLoading();
    }
}

/**
 * Calcula la conversión según el tipo de moneda
 * @param {number} amount - Monto en CLP
 * @param {number} exchangeRate - Tasa de cambio
 * @param {string} currency - Tipo de moneda
 * @returns {number} - Monto convertido
 */
function calculateConversion(amount, exchangeRate, currency) {
    // Para UF y UTM, dividimos el monto en CLP por el valor
    // Para dólares y euros, también dividimos (CLP / valor de la moneda extranjera)
    return amount / exchangeRate;
}

/**
 * Muestra el resultado de la conversión
 * @param {number} originalAmount - Monto original en CLP
 * @param {string} currency - Código de moneda
 * @param {number} exchangeRate - Tasa de cambio
 * @param {number} convertedAmount - Monto convertido
 * @param {string} updateDate - Fecha de actualización
 */
function displayResult(originalAmount, currency, exchangeRate, convertedAmount, updateDate) {
    originalAmountSpan.textContent = formatNumber(originalAmount);
    targetCurrencySpan.textContent = currencyNames[currency];
    exchangeRateSpan.textContent = formatNumber(exchangeRate);
    convertedAmountSpan.textContent = formatConvertedAmount(convertedAmount, currency);
    updateDateSpan.textContent = updateDate;
    
    showResult();
}

/**
 * Formatea el monto convertido según el tipo de moneda
 * @param {number} amount - Monto a formatear
 * @param {string} currency - Tipo de moneda
 * @returns {string} - Monto formateado
 */
function formatConvertedAmount(amount, currency) {
    const symbol = getCurrencySymbol(currency);
    
    if (currency === 'uf' || currency === 'utm') {
        return `${formatNumber(amount, 4)} ${symbol}`;
    } else {
        return `${symbol} ${formatNumber(amount, 2)}`;
    }
}

/**
 * Obtiene el símbolo de la moneda
 * @param {string} currency - Código de moneda
 * @returns {string} - Símbolo de la moneda
 */
function getCurrencySymbol(currency) {
    const symbols = {
        'dolar': 'USD',
        'dolar_intercambio': 'USD',
        'euro': 'EUR',
        'uf': 'UF',
        'utm': 'UTM'
    };
    return symbols[currency] || currency.toUpperCase();
}

/**
 * Formatea números con separadores de miles
 * @param {number} number - Número a formatear
 * @param {number} decimals - Cantidad de decimales
 * @returns {string} - Número formateado
 */
function formatNumber(number, decimals = 0) {
    return new Intl.NumberFormat('es-CL', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(number);
}

// Funciones para mostrar/ocultar elementos
function showLoading() {
    loadingDiv.classList.remove('hidden');
    convertBtn.disabled = true;
}

function hideLoading() {
    loadingDiv.classList.add('hidden');
    convertBtn.disabled = false;
}

function showResult() {
    resultDiv.classList.remove('hidden');
}

function hideResult() {
    resultDiv.classList.add('hidden');
}

function showError(message) {
    errorDiv.querySelector('p').textContent = message;
    errorDiv.classList.remove('hidden');
}

function hideError() {
    errorDiv.classList.add('hidden');
}

// Función para limpiar el formulario
function clearForm() {
    amountInput.value = '';
    currencySelect.value = '';
    hideResult();
    hideError();
}

// Agregar evento para limpiar mensajes al cambiar valores
amountInput.addEventListener('input', hideError);
currencySelect.addEventListener('change', hideError);