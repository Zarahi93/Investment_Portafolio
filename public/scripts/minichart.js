// Variables globales
let stockCharts = {}; // Objeto para almacenar múltiples gráficos
let refreshInterval = null;
let countdownInterval = null;
const UPDATE_INTERVAL = 60000; // 1 minuto en milisegundos

// Función para formatear números
function formatNumber(num) {
    // num puede venir como string o number
    if (num === null || num === undefined) return 'N/A';
    const n = Number(num);
    if (!Number.isFinite(n)) return 'N/A';
    return n.toFixed(2);
}

// Función para formatear fechas
function formatDate(dateStr) {
    try {
        const date = (dateStr instanceof Date) ? dateStr : new Date(dateStr);
        if (isNaN(date.getTime())) return '—';
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return '—';
    }
}

// Función para obtener datos del stock desde la API
async function fetchStockData(symbol) {
    try {
        const response = await fetch(`/api/today/${symbol}`);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching stock data:', error);
        throw error;
    }
}

// Función para iniciar el contador de actualización
function startCountdown() {
    let seconds = UPDATE_INTERVAL / 1000;
    document.getElementById('countdown').textContent = seconds;
    
    clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
        seconds--;
        document.getElementById('countdown').textContent = seconds;
        if (seconds <= 0) {
            seconds = UPDATE_INTERVAL / 1000;
        }
    }, 1000);
}

// Función para actualizar el gráfico
async function updateChart(symbol, chartId) {
    const chartContainer = document.getElementById(chartId);
    const chartPrefix = chartId.replace('chartContainer', '');
    
    try {
        // Obtener datos de la API
        const stockData = await fetchStockData(symbol);
        
        // Actualizar información del símbolo (si es el primer gráfico)
        if (chartPrefix === '') {
            document.getElementById('stockSymbol').textContent = stockData.symbol;
            document.getElementById('stockInterval').textContent = stockData.name;
        }
        
        // Extraer datos relevantes
        const dataPoints = stockData.dataPoints;
        const closePrices = dataPoints.map(point => point.close);
        const labels = dataPoints.map(point => formatDate(point.time));
        
        // Calcular métricas
        const currentPrice = closePrices[closePrices.length - 1];
        const firstPrice = closePrices[0];
        const priceChange = currentPrice - firstPrice;
        const percentChange = (priceChange / firstPrice) * 100;
        
        // Actualizar la UI específica para este gráfico
        document.getElementById(`currentPrice${chartPrefix}`).textContent = formatNumber(currentPrice);
        const changeElement = document.getElementById(`priceChange${chartPrefix}`);
        changeElement.textContent = `${priceChange >= 0 ? '+' : ''}${formatNumber(priceChange)} (${formatNumber(percentChange)}%)`;
        changeElement.className = `stock-change ${priceChange >= 0 ? 'positive' : 'negative'}`;
        
        if (chartPrefix === '') {
            document.getElementById('lastUpdate').textContent = formatDate(new Date());
        }
        
        // Configurar colores
        const chartColor = priceChange >= 0 ? '#4CAF50' : '#F44336';
        
        // Crear o actualizar el gráfico
        const canvas = document.getElementById(`stockChart${chartPrefix}`) || document.createElement('canvas');
        if (!document.getElementById(`stockChart${chartPrefix}`)) {
            canvas.id = `stockChart${chartPrefix}`;
            chartContainer.innerHTML = '';
            chartContainer.appendChild(canvas);
        }
        
        const ctx = canvas.getContext('2d');
        
        if (stockCharts[chartId]) {
            // Actualizar gráfico existente
            stockCharts[chartId].data.labels = labels;
            stockCharts[chartId].data.datasets[0].data = closePrices;
            stockCharts[chartId].data.datasets[0].borderColor = chartColor;
            stockCharts[chartId].data.datasets[0].backgroundColor = `${chartColor}20`;
            stockCharts[chartId].update();
        } else {
            // Crear nuevo gráfico
            stockCharts[chartId] = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Price',
                        data: closePrices,
                        borderColor: chartColor,
                        backgroundColor: `${chartColor}20`,
                        borderWidth: 2,
                        tension: 0.1,
                        pointRadius: 0,
                        fill: true,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            enabled: true,
                            intersect: false,
                            mode: 'index'
                        }
                    },
                    scales: {
                        x: {
                            display: false,
                            grid: {
                                display: false
                            }
                        },
                        y: {
                            display: false,
                            grid: {
                                display: false
                            },
                            suggestedMin: Math.min(...closePrices) * 0.995,
                            suggestedMax: Math.max(...closePrices) * 1.005
                        }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'nearest'
                    }
                }
            });
        }
        
        // Reiniciar el contador (solo una vez)
        if (chartPrefix === '') {
            startCountdown();
        }
        
    } catch (error) {
        console.error('Error during updating data', error);
        chartContainer.innerHTML = `<div class="error">Error loading data: ${error.message}</div>`;
        
        // Reintentar en 30 segundos si hay error
        clearInterval(refreshInterval);
        setTimeout(() => {
            refreshInterval = setInterval(() => {
                updateChart('AMZN', 'chartContainer');
                // updateChart('AMZN', 'chartContainer2');
                // updateChart('AAPL', 'chartContainer3');
            }, UPDATE_INTERVAL);
            updateChart(symbol, chartId);
        }, 30000);
    }
}

// Inicializar los gráficos cuando la página cargue
window.addEventListener('load', () => {
    updateChart('AMZN', 'chartContainer');
    // updateChart('AMZN', 'chartContainer2');
    // updateChart('AAPL', 'chartContainer3');
    
    // Configurar actualización periódica
    refreshInterval = setInterval(() => {
        updateChart('AMZN', 'chartContainer');
        // updateChart('AMZN', 'chartContainer2');
        // updateChart('AAPL', 'chartContainer3');
    }, UPDATE_INTERVAL);
});

// Limpiar intervalos al salir de la página
window.addEventListener('beforeunload', () => {
    clearInterval(refreshInterval);
    clearInterval(countdownInterval);
    // Destruir todos los gráficos
    Object.values(stockCharts).forEach(chart => chart.destroy());
});

document.addEventListener('DOMContentLoaded', function() {
            // Animación de entrada para las tarjetas
                    updateChart('AMZN', 'chartContainer');

        });