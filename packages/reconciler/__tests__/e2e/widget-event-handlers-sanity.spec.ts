import puppeteer from 'puppeteer';
import { getPageAtUrl } from './browser-utils';

const sleep = async (seconds: number) => await new Promise(resolve => setTimeout(resolve, seconds * 1000));

describe('widget event handlers sanity', () => {
    let browser: puppeteer.Browser;
    beforeAll(async () => {
        browser = await puppeteer.launch({
            // devtools: true,
            // slowMo: 100,
        });
    }, 30000);

    it('should call event handler only once', async () => {
        const getCounterText = () => Array.from(document.querySelectorAll('[data-testid="richTextElement"]')).map((el) => (el as HTMLElement).innerText)[0];

        const waitForCounterValueNotEqual = (value: number) => {
            return Array.from(document.querySelectorAll('[data-testid="richTextElement"]'))
            .map(el => (el as HTMLElement).innerText)
            .map(s => {
                const match = s.match(/\d+/);
                if (match) {
                    return parseInt(match[0], 10);
                }
            }).filter(i => i !== null)[0] !== value;
        }

        const page = await getPageAtUrl(browser, 'https://yurym4.wixsite.com/react-velo-e2e/widget-event-handler-sanity');
        const toggleButton = await page.$('button[aria-label="Toggle"]');
        const widgetButton = await page.$('button[aria-label="Primary"]');

        if (!toggleButton) {
            throw new Error(`Unable to find toogle button`);
        }

        if (!widgetButton) {
            throw new Error(`Unable to find widget button`);
        }


        let clicksTodo = 6;
        do {
            await toggleButton.click();
            await sleep(1);
            clicksTodo--;
        } while(clicksTodo > 0);

        await widgetButton.click();

        // wait for counter value != 0
        await page.waitForFunction(waitForCounterValueNotEqual, {}, 0);

        const counterText = await page.evaluate(getCounterText);
        expect(counterText).toBe('1');
    }, 60000);

    afterAll(async () => {
        await browser.close();
    });
});
