/**
 * Formats a number as currency based on the tenant's setting
 */
export function formatCurrency(amount: number, currency: string = 'FCFA') {
    if (currency === 'FCFA') {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'XOF',
            currencyDisplay: 'symbol',
            minimumFractionDigits: 0,
        }).format(amount).replace('XOF', 'FCFA');
    }

    try {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: currency === '€' ? 'EUR' : currency === '$' ? 'USD' : currency,
        }).format(amount);
    } catch (e) {
        return `${amount} ${currency}`;
    }
}
