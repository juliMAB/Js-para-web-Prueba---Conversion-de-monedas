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
const chartSection = document.getElementById('chartSection');

// Elementos del resultado
const originalAmountSpan = document.getElementById('originalAmount');
const targetCurrencySpan = document.getElementById('targetCurrency');
const exchangeRateSpan = document.getElementById('exchangeRate');
const convertedAmountSpan = document.getElementById('convertedAmount');
const updateDateSpan = document.getElementById('updateDate');

// Variable para el gráfico
let currencyChart = null;

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
    hideChart();
    
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
        
        // Crear y mostrar el gráfico
        await createChart(currency, data.serie);
        
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

function showChart() {
    chartSection.classList.remove('hidden');
}

function hideChart() {
    chartSection.classList.add('hidden');
}

/**
 * Crea y muestra el gráfico con los datos de los últimos 3 días
 * @param {string} currency - Código de la moneda
 * @param {Array} serie - Serie de datos de la API
 */
async function createChart(currency, serie) {
    // Obtener los últimos 3 días de datos
    const last3Days = serie.slice(0, 3).reverse(); // Invertir para mostrar cronológicamente
    
    // Preparar datos para el gráfico
    const labels = last3Days.map(item => {
        const date = new Date(item.fecha);
        return date.toLocaleDateString('es-CL', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
        });
    });
    
    const values = last3Days.map(item => item.valor);
    
    // Destruir gráfico anterior si existe
    if (currencyChart) {
        currencyChart.destroy();
    }
    
    // Obtener el canvas
    const ctx = document.getElementById('currencyChart').getContext('2d');
    
    // Configurar colores según el tipo de moneda
    const colors = getCurrencyColors(currency);
    
    // Crear el gráfico
    currencyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `Valor en CLP - ${currencyNames[currency]}`,
                data: values,
                borderColor: colors.border,
                backgroundColor: colors.background,
                borderWidth: 3,
                fill: true,
                tension: 0.1,
                pointBackgroundColor: colors.border,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            family: 'MS Sans Serif',
                            size: 12
                        }
                    }
                },
                title: {
                    display: true,
                    text: `Evolución de ${currencyNames[currency]} - Últimos 3 días`,
                    font: {
                        family: 'MS Sans Serif',
                        size: 14,
                        weight: 'bold'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return formatNumber(value, 2);
                        },
                        font: {
                            family: 'MS Sans Serif',
                            size: 11
                        }
                    },
                    title: {
                        display: true,
                        text: 'Valor en CLP',
                        font: {
                            family: 'MS Sans Serif',
                            size: 12
                        }
                    }
                },
                x: {
                    ticks: {
                        font: {
                            family: 'MS Sans Serif',
                            size: 11
                        }
                    }
                }
            },
            elements: {
                point: {
                    hoverBackgroundColor: colors.border
                }
            }
        }
    });
    
    // Mostrar la sección del gráfico
    showChart();
}

/**
 * Obtiene los colores para el gráfico según el tipo de moneda
 * @param {string} currency - Código de la moneda
 * @returns {Object} - Objeto con colores border y background
 */
function getCurrencyColors(currency) {
    const colorMap = {
        'dolar': {
            border: '#2e7d32',
            background: 'rgba(76, 175, 80, 0.1)'
        },
        'dolar_intercambio': {
            border: '#1976d2',
            background: 'rgba(33, 150, 243, 0.1)'
        },
        'euro': {
            border: '#7b1fa2',
            background: 'rgba(156, 39, 176, 0.1)'
        },
        'uf': {
            border: '#d32f2f',
            background: 'rgba(244, 67, 54, 0.1)'
        },
        'utm': {
            border: '#f57c00',
            background: 'rgba(255, 152, 0, 0.1)'
        }
    };
    
    return colorMap[currency] || {
        border: '#666',
        background: 'rgba(102, 102, 102, 0.1)'
    };
}

// Función para limpiar el formulario
function clearForm() {
    amountInput.value = '';
    currencySelect.value = '';
    hideResult();
    hideError();
    hideChart();
    if (currencyChart) {
        currencyChart.destroy();
        currencyChart = null;
    }
}

// Agregar evento para limpiar mensajes al cambiar valores
amountInput.addEventListener('input', hideError);
currencySelect.addEventListener('change', function() {
    hideError();
    hideChart();
    if (currencyChart) {
        currencyChart.destroy();
        currencyChart = null;
    }
});