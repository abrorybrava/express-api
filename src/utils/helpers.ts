export const getWIB = (): Date => {
    const localDate = new Date();
    const jakartaTimezoneOffset = 7 * 60; // Jakarta is UTC+7
    const jakartaDate = new Date(
      localDate.getTime() + jakartaTimezoneOffset * 60 * 1000
    );

    return jakartaDate;
};

export const formatRupiah = (price: string): String => {
    const number = parseFloat(price);
    return new Intl.NumberFormat('id-ID').format(number)
};

export const formatRupiahExportPDF = (price: string): String => {
    const number = parseFloat(price);
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
    }).format(number);
};