window.initAccDashboard = function () {

    // --------------------
    // Elements
    // --------------------
    const ctx = document
        .getElementById('applicantsChartCanvas')
        .getContext('2d');

    const loadChartButton = document.getElementById('loadChartButton');
    const printDashboardButton = document.getElementById('printDashboardButton');
    const yearFromInput = document.getElementById('yearFromInput');
    const yearToInput = document.getElementById('yearToInput');

    const totalApplicants = document.getElementById('totalApplicants');
    const maleApplicants = document.getElementById('maleApplicants');
    const femaleApplicants = document.getElementById('femaleApplicants');

    // --------------------
    // Chart instance
    // --------------------
    const applicantsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
            datasets: []
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'top' } },
            scales: { y: { beginAtZero: true } }
        }
    });

    // --------------------
    // Random color generator
    // --------------------
    function getRandomColor(alpha = 1) {
        const r = Math.floor(Math.random() * 200) + 30;
        const g = Math.floor(Math.random() * 200) + 30;
        const b = Math.floor(Math.random() * 200) + 30;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // --------------------
    // Load Dashboard Data
    // --------------------
    async function loadApplicantsChart() {

        const fromYear = yearFromInput.value;
        const toYear = yearToInput.value || fromYear;

        if (!fromYear) {
            alert('Please enter a year.');
            return;
        }

        const url = `/api/applicants/dashboard/data?fromYear=${fromYear}&toYear=${toYear}`;

        let response;
        try {
            response = await apiFetch(url, { 
                credentials: 'same-origin'
            });
        } catch (err) {
            console.error('Fetch failed:', err);
            return;
        }

        if (!response.ok) {
            console.error('HTTP error:', response.status);
            return;
        }

        const result = await response.json();

        // --------------------
        // Update cards
        // --------------------
        totalApplicants.textContent = result.totalApplicants;

        let male = 0;
        let female = 0;

        result.sexStats.forEach(row => {
            if (!row.sex) return;

            const sex = row.sex.toLowerCase();
            if (sex === 'male') male = row.total;
            if (sex === 'female') female = row.total;
        });

        maleApplicants.textContent = male;
        femaleApplicants.textContent = female;

        // --------------------
        // Prepare chart data
        // --------------------
        const labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const yearData = {};

        result.monthlyData.forEach(row => {
            if (!yearData[row.year]) {
                yearData[row.year] = Array(12).fill(0);
            }
            yearData[row.year][row.month - 1] = row.total;
        });

        applicantsChart.data.labels = labels;
        applicantsChart.data.datasets = Object.keys(yearData).map(year => {
            const color = getRandomColor(0.6);
            return {
                label: year,
                data: yearData[year],
                backgroundColor: color,
                borderColor: color.replace('0.6', '1'),
                borderWidth: 1
            };
        });

        applicantsChart.update();
    }

    // --------------------
    // Events
    // --------------------
    loadChartButton.addEventListener('click', loadApplicantsChart);
    printDashboardButton.addEventListener('click', () => window.print());

    // Initial load
    loadApplicantsChart();
};
