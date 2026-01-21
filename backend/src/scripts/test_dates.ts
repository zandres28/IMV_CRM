
function testDates() {
    const yearNum = 2025;
    const monthIndex = 5; // June

    const firstDayOfMonth = new Date(yearNum, monthIndex, 1);
    const lastDayOfMonth = new Date(yearNum, monthIndex + 1, 0);
    
    console.log("First Day:", firstDayOfMonth.toString());
    console.log("Last Day:", lastDayOfMonth.toString());

    const installDateStr = '2025-06-18';
    const installDate = new Date(installDateStr);
    console.log("Install Date (from string):", installDate.toString());
    console.log("Install Date (getDate):", installDate.getDate());

    if (installDate > lastDayOfMonth) {
        console.log("Skipped: installDate > lastDayOfMonth");
    } else {
        console.log("Included");
    }

    if (installDate >= firstDayOfMonth && installDate <= lastDayOfMonth) {
        console.log("Prorated");
        const billedDays = lastDayOfMonth.getDate() - installDate.getDate() + 1;
        console.log("Billed Days:", billedDays);
    } else {
        console.log("Full Month (or older)");
    }
}

testDates();
