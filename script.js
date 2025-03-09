// script.js

// Embed tax slabs data directly
const taxSlabs = {
    old: {
        standardDeduction: 50000,
        rebate: { threshold: 500000, amount: 12500 },
        slabs: [
            { min: 0, max: 250000, rate: 0 },
            { min: 250000, max: 500000, rate: 0.05 },
            { min: 500000, max: 1000000, rate: 0.20 },
            { min: 1000000, max: 10000000, rate: 0.30 }
        ]
    },
    new: {
        standardDeduction: 75000,
        rebate: { threshold: 700000, amount: 25000 },
        slabs: [
            { min: 0, max: 400000, rate: 0 },
            { min: 400000, max: 800000, rate: 0.05 },
            { min: 800000, max: 1200000, rate: 0.10 },
            { min: 1200000, max: 1600000, rate: 0.15 },
            { min: 1600000, max: 2000000, rate: 0.20 },
            { min: 2000000, max: 2400000, rate: 0.25 },
            { min: 2400000, max: 10000000, rate: 0.30 }
        ]
    },
    surcharge: [
        { min: 5000000, max: 10000000, rate: 0.10 },
        { min: 10000000, max: 20000000, rate: 0.15 },
        { min: 20000000, max: 50000000, rate: 0.25 },
        { min: 50000000, max: 100000000, rate: 0.37 }
    ],
    cess: 0.04
};

let isTaxSlabsLoaded = true;

function parseIndianNumber(str) {
    return parseFloat(str.replace(/,/g, '')) || 0;
}

function formatIndianNumber(num) {
    let [integer] = num.toFixed(2).split('.');
    let lastThree = integer.slice(-3);
    let otherDigits = integer.slice(0, -3);
    if (otherDigits) {
        lastThree = ',' + lastThree;
        otherDigits = otherDigits.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    }
    return otherDigits + lastThree + (num.toString().split('.')[1] ? '.' + num.toFixed(2).split('.')[1] : '');
}

function restrictAndFormat(input) {
    let value = input.value.replace(/[^0-9]/g, '');
    if (value) {
        let num = parseFloat(value);
        if (input.id === 'grossSalary' && num > 1000000000) {
            num = 1000000000;
            alert('Gross Salary cannot exceed ₹100 Cr.');
        }
        if (['section80C', 'section80D', 'hraExemption', 'npsEmployer', 'otherDeductions'].includes(input.id) && num > 10000000) {
            num = 10000000;
            alert('Deductions cannot exceed ₹1 Cr.');
        }
        input.value = formatIndianNumber(num);
    } else {
        input.value = '';
    }
}

function restrictNumbersAndDecimals(input) {
    input.value = input.value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1');
    let num = parseFloat(input.value);
    if (num > 100) {
        input.value = '100';
        alert('Rate cannot exceed 100%.');
    }
}

function toggleDeductions() {
    const regime = document.getElementById('taxRegime');
    if (!regime) return;
    const deductions = ['section80C', 'section80D', 'hraExemption'];
    deductions.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.disabled = (regime.value === 'new');
            if (regime.value === 'new') {
                input.value = '';
            }
        }
    });
    const npsEmployer = document.getElementById('npsEmployer');
    if (npsEmployer) npsEmployer.disabled = false;
}

function toggleExemptions() {
    const exemptionsSection = document.getElementById('exemptionsSection');
    const toggleButton = document.getElementById('toggleExemptions');
    if (!exemptionsSection || !toggleButton) return;
    if (exemptionsSection.style.display === 'none' || exemptionsSection.style.display === '') {
        exemptionsSection.style.display = 'block';
        toggleButton.textContent = 'Hide Exemptions';
    } else {
        exemptionsSection.style.display = 'none';
        toggleButton.textContent = 'Show Exemptions';
    }
}

function populateTaxReferenceTable(attempt = 1) {
    const tbody = document.querySelector('#taxReferenceTable');
    if (!tbody) {
        console.error(`Tax reference table body not found! Attempt ${attempt}`);
        if (attempt < 3) {
            setTimeout(() => populateTaxReferenceTable(attempt + 1), 500);
        } else {
            console.error('Failed to load tax reference table after 3 attempts.');
        }
        return;
    }

    if (!taxSlabs.old || !taxSlabs.new) {
        console.warn('Tax slabs data not loaded:', { isTaxSlabsLoaded, taxSlabs });
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 2;
        cell.textContent = 'Failed to load tax slabs...';
        row.appendChild(cell);
        tbody.appendChild(row);
        return;
    }

    const maxRows = Math.max(taxSlabs.old.slabs.length, taxSlabs.new.slabs.length);
    tbody.innerHTML = ''; // Clear existing content safely
    for (let i = 0; i < maxRows; i++) {
        const oldSlab = taxSlabs.old.slabs[i] || { min: '-', max: '-', rate: '-' };
        const newSlab = taxSlabs.new.slabs[i] || { min: '-', max: '-', rate: '-' };
        const row = document.createElement('tr');
        const oldCell = document.createElement('td');
        const newCell = document.createElement('td');
        oldCell.textContent = oldSlab.min === '-' ? '-' : `₹${formatIndianNumber(oldSlab.min)} - ₹${oldSlab.max === Infinity ? 'Above' : formatIndianNumber(oldSlab.max)}: ${oldSlab.rate * 100}%`;
        newCell.textContent = newSlab.min === '-' ? '-' : `₹${formatIndianNumber(newSlab.min)} - ₹${newSlab.max === Infinity ? 'Above' : formatIndianNumber(newSlab.max)}: ${newSlab.rate * 100}%`;
        row.appendChild(oldCell);
        row.appendChild(newCell);
        tbody.appendChild(row);
    }
    const calcButton = document.querySelector('#salaryCalculator .calculate');
    if (calcButton) calcButton.disabled = false;
}

function calculateSalary() {
    if (!isTaxSlabsLoaded) {
        alert('Please wait while tax slabs are loading...');
        return;
    }

    // Validate select inputs
    let regime = document.getElementById('taxRegime').value;
    if (!['new', 'old'].includes(regime)) {
        alert('Invalid tax regime selected.');
        return;
    }
    let pfOption = document.getElementById('pfOption').value;
    if (!['fixed', '12percent'].includes(pfOption)) {
        alert('Invalid PF option selected.');
        return;
    }

    let gross = Math.min(parseIndianNumber(document.getElementById('grossSalary').value), 1000000000);
    let section80C = Math.min(parseIndianNumber(document.getElementById('section80C').value) || 0, 10000000);
    let section80D = Math.min(parseIndianNumber(document.getElementById('section80D').value) || 0, 10000000);
    let hraExemption = Math.min(parseIndianNumber(document.getElementById('hraExemption').value) || 0, 10000000);
    let npsEmployer = Math.min(parseIndianNumber(document.getElementById('npsEmployer').value) || 0, 10000000);
    let otherDeductions = Math.min(parseIndianNumber(document.getElementById('otherDeductions').value) || 0, 10000000);

    if (!gross) {
        alert("Please enter Gross Salary.");
        return;
    }

    if (gross < 0) {
        alert("Gross Salary cannot be negative.");
        return;
    }

    section80C = Math.min(section80C, 150000);
    section80D = Math.min(section80D, 50000);
    let basicSalary = gross * 0.5;
    npsEmployer = Math.min(npsEmployer, basicSalary * 0.10);

    let totalDeductionsInput = section80C + section80D + hraExemption + npsEmployer + otherDeductions;
    if (totalDeductionsInput > gross) {
        alert("Total deductions cannot exceed Gross Salary.");
        return;
    }

    let employeePF = (pfOption === '12percent') ? Math.min(gross * 0.12, 150000) : 1800 * 12;
    let employerPF = employeePF;
    let standardDeduction = taxSlabs[regime].standardDeduction || 0;
    let taxableEmployerPF = employerPF > 750000 ? employerPF - 750000 : 0;

    if (regime === 'new' && (section80C + section80D + hraExemption) > 0) {
        let confirmUse = confirm("Note: In the New Tax Regime (FY 2025-26), deductions like Section 80C, 80D, and HRA are not allowed. 'Employer NPS Contribution' (Section 80CCD(2)) is the only valid deduction here. Proceed with these deductions?");
        if (!confirmUse) {
            document.getElementById('section80C').value = '';
            document.getElementById('section80D').value = '';
            document.getElementById('hraExemption').value = '';
            section80C = 0;
            section80D = 0;
            hraExemption = 0;
        }
    }

    let nonTaxableDeductions = regime === 'old' ? (section80C + section80D + hraExemption + npsEmployer) : npsEmployer;
    let taxableIncome = gross - standardDeduction - employeePF + taxableEmployerPF - nonTaxableDeductions - otherDeductions;

    if (taxableIncome < 0) {
        taxableIncome = 0;
    }

    let slabs = taxSlabs[regime].slabs;
    let tax = 0;
    for (let slab of slabs) {
        if (taxableIncome > slab.min) {
            let taxableInSlab = Math.min(taxableIncome, slab.max) - slab.min;
            tax += taxableInSlab * slab.rate;
        }
    }

    let rebate = taxSlabs[regime].rebate;
    if (taxableIncome <= rebate.threshold) {
        tax = Math.max(0, tax - rebate.amount);
    }

    let surcharge = 0;
    for (let s of taxSlabs.surcharge) {
        if (taxableIncome > s.min && taxableIncome <= s.max) {
            surcharge = tax * s.rate;
            break;
        }
    }

    let cess = (tax + surcharge) * taxSlabs.cess;
    let totalTax = tax + surcharge + cess;
    let totalDeductions = totalTax + employeePF + standardDeduction + nonTaxableDeductions + otherDeductions;
    let net = gross - totalTax - employeePF - nonTaxableDeductions - otherDeductions;
    let netMonthly = net / 12;

    const maxTaxable = slabs[slabs.length - 1].max === Infinity ? taxableIncome * 1.2 : slabs[slabs.length - 1].max;
    const progressPercentage = (taxableIncome / maxTaxable) * 100;

    // Secure DOM update for taxProgress, matching original styling
    const progress = document.getElementById('taxProgress');
    progress.innerHTML = ''; // Clear existing content
    const progDiv = document.createElement('div');
    progDiv.style.margin = '10px 0';
    const progLabel = document.createElement('label');
    progLabel.className = 'label';
    progLabel.textContent = 'Taxable Income Progress:';
    const bar = document.createElement('div');
    bar.style.width = '100%';
    bar.style.background = '#ddd';
    bar.style.borderRadius = '5px';
    bar.style.height = '20px';
    bar.style.overflow = 'hidden';
    const fill = document.createElement('div');
    fill.style.width = `${progressPercentage}%`;
    fill.style.background = '#D4AF37';
    fill.style.height = '100%';
    bar.appendChild(fill);
    progDiv.appendChild(progLabel);
    progDiv.appendChild(bar);
    progress.appendChild(progDiv);

    // Secure DOM update for result1, matching original structure
    const result = document.getElementById('result1');
    result.innerHTML = ''; // Clear existing content
    const table = document.createElement('table');
    table.className = 'result-table';
    const rows = [
        ['Gross Salary:', formatIndianNumber(gross)],
        ['Standard Deduction:', formatIndianNumber(standardDeduction)],
        [`Employee PF (${pfOption === '12percent' ? '12% (capped at ₹1.5L)' : '₹1,800 PM'}):`, formatIndianNumber(employeePF)],
        ['Employer PF (Non-Taxable):', formatIndianNumber(employerPF - taxableEmployerPF)],
        ...(taxableEmployerPF > 0 ? [['Employer PF (Taxable Excess):', formatIndianNumber(taxableEmployerPF)]] : []),
        ...(regime === 'old' ? [
            ['Section 80C Deduction:', formatIndianNumber(section80C)],
            ['Section 80D Deduction:', formatIndianNumber(section80D)],
            ['HRA Exemption:', formatIndianNumber(hraExemption)]
        ] : []),
        ['Employer NPS Contribution:', formatIndianNumber(npsEmployer)],
        ['Other Deductions:', formatIndianNumber(otherDeductions)],
        ['Taxable Income:', formatIndianNumber(taxableIncome)],
        ['Income Tax:', formatIndianNumber(tax), tax > 500000 ? 'high-tax' : ''],
        ...(surcharge > 0 ? [['Surcharge:', formatIndianNumber(surcharge)]] : []),
        ['Cess (4%):', formatIndianNumber(cess)],
        ['Total Tax:', formatIndianNumber(totalTax), totalTax > 500000 ? 'high-tax' : ''],
        ['Total Deductions:', formatIndianNumber(totalDeductions)],
        [`Net Salary (${regime === 'old' ? 'Old (FY 2025-26)' : 'New (FY 2025-26)'}, FY 2025-26):`, formatIndianNumber(net)],
        ['Net Monthly Salary:', formatIndianNumber(netMonthly)]
    ];
    rows.forEach(([labelText, valueText, className]) => {
        const tr = document.createElement('tr');
        const tdLabel = document.createElement('td');
        tdLabel.className = 'label';
        tdLabel.textContent = labelText;
        const tdValue = document.createElement('td');
        tdValue.className = className ? `value ${className}` : 'value';
        tdValue.textContent = `₹${valueText}`;
        tr.appendChild(tdLabel);
        tr.appendChild(tdValue);
        table.appendChild(tr);
    });
    result.appendChild(table);

    trackVisit();
}

function resetSalary() {
    document.getElementById('grossSalary').value = '';
    document.getElementById('taxRegime').value = 'new';
    document.getElementById('pfOption').value = 'fixed';
    document.getElementById('section80C').value = '';
    document.getElementById('section80D').value = '';
    document.getElementById('hraExemption').value = '';
    document.getElementById('npsEmployer').value = '';
    document.getElementById('otherDeductions').value = '';
    document.getElementById('taxProgress').innerHTML = '';
    document.getElementById('result1').innerHTML = '';
    document.getElementById('exemptionsSection').style.display = 'none';
    document.getElementById('toggleExemptions').textContent = 'Show Exemptions';
    toggleDeductions();
}

function toggleDarkMode() {
    const body = document.body;
    body.classList.toggle('dark-mode');
    const isDarkMode = body.classList.contains('dark-mode');
    const button = document.getElementById('darkModeToggle');
    const icon = button.querySelector('.icon');
    icon.textContent = isDarkMode ? '🌙' : '☀️';
    localStorage.setItem('darkMode', isDarkMode ? 'enabled' : 'disabled');
    if (document.getElementById('result1').childElementCount > 0) calculateSalary();
}

function trackVisit() {
    let now = new Date().getTime();
    let visits = JSON.parse(localStorage.getItem('visits')) || [];
    // Keep only visits from the last year and cap at 1000 entries
    visits = visits.filter(t => now - t <= 365 * 24 * 60 * 60 * 1000).slice(-1000);
    visits.push(now);
    localStorage.setItem('visits', JSON.stringify(visits));

    let last24h = visits.filter(t => now - t <= 24 * 60 * 60 * 1000).length;
    let lastWeek = visits.filter(t => now - t <= 7 * 24 * 60 * 60 * 1000).length;
    let lastMonth = visits.filter(t => now - t <= 30 * 24 * 60 * 60 * 1000).length;
    let lastYear = visits.filter(t => now - t <= 365 * 24 * 60 * 60 * 1000).length;

    // Secure DOM update for visitorStats
    const stats = document.getElementById('visitorStats');
    stats.textContent = `Visitors: Last 24h: ${last24h} | Last Week: ${lastWeek} | Last Month: ${lastMonth} | Last Year: ${lastYear}`;
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed');
    const darkModePreference = localStorage.getItem('darkMode');
    if (darkModePreference === 'enabled') {
        document.body.classList.add('dark-mode');
        document.getElementById('darkModeToggle').querySelector('.icon').textContent = '🌙';
    }
    document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);
    trackVisit();
    toggleDeductions();
    populateTaxReferenceTable();
});