const puppeteer = require('puppeteer');

(async () => {
    console.log('Launching browser (Toggle Debug)...');
    const browser = await puppeteer.launch({
        headless: true, // headless true for speed
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(60000);

    try {
        console.log('Navigating to localhost:3001...');
        await page.goto('http://localhost:3001', { waitUntil: 'networkidle0' });

        // 1. Check Initial State
        let isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
        console.log(`INITIAL STATE: html.dark = ${isDark}`);

        // 2. Find Toggle Button (Sun/Moon icon)
        // We look for the button in the Sidebar (desktop) or header (mobile)
        // Sidebar button usually has title "Cambiar a modo..."
        console.log('Attempting to click toggle...');

        const clicked = await page.evaluate(() => {
            // Try to find by title attribute first
            const btn = document.querySelector('button[title*="Cambiar a modo"]');
            if (btn) {
                btn.click();
                return true;
            }
            // Fallback: look for button with Sun/Moon icon inside
            const svgs = document.querySelectorAll('svg');
            for (const svg of svgs) {
                if (svg.classList.contains('lucide-sun') || svg.classList.contains('lucide-moon')) {
                    const parentBtn = svg.closest('button');
                    if (parentBtn) {
                        parentBtn.click();
                        return true;
                    }
                }
            }
            return false;
        });

        if (!clicked) {
            console.error('Could not find toggle button to click.');
        } else {
            console.log('Button clicked.');
            await new Promise(r => setTimeout(r, 1000)); // wait for react

            // 3. Check Post-Click State
            isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
            console.log(`POST-CLICK STATE: html.dark = ${isDark}`);

            // 4. Click Again
            await page.evaluate(() => {
                const btn = document.querySelector('button[title*="Cambiar a modo"]');
                if (btn) btn.click();
            });
            await new Promise(r => setTimeout(r, 1000));
            isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
            console.log(`POST-CLICK-2 STATE: html.dark = ${isDark}`);
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await browser.close();
    }
})();
