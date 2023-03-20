import puppeteer from 'puppeteer';
import { getPageAtUrl } from './browser-utils';

const sleep = async (seconds: number) => await new Promise(resolve => setTimeout(resolve, seconds * 1000));

async function clickButtonMultipleTimes(button:  puppeteer.ElementHandle<Element> , times: number) {
    let clicksTodo = times;
    do {
        await button.click();
        await sleep(1);
        clicksTodo--;
    } while(clicksTodo > 0);
}

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

        const waitForCounterValueToBe = ({value, op}: {
            value: number;
            op: "eq" | "neq"
        }) => {
        
            const valueOnPage = Array.from(document.querySelectorAll('[data-testid="richTextElement"]'))
            .map(el => (el as HTMLElement).innerText)
            .map(s => {
                const match = s.match(/\d+/);
                if (match) {
                    return parseInt(match[0], 10);
                }
            }).filter(i => i !== null)[0];

            return op === 'eq' ? valueOnPage === value : valueOnPage !== value;
        }

        const page = await getPageAtUrl(browser, 'https://yurym4.wixsite.com/react-velo-e2e/widget-event-handler-sanity');
        const toggleButton = await page.$('button[aria-label="Toggle"]');
        const widgetButton = await page.$('button[aria-label="Primary"]');
        const plusOneButton = await page.$('button[aria-label="PlusOne"]');

        if (!toggleButton) {
            throw new Error(`Unable to find toogle button`);
        }

        if (!widgetButton) {
            throw new Error(`Unable to find widget button`);
        }

        if (!plusOneButton) {
            throw new Error(`Unable to find plusOne button`);
        }

        await clickButtonMultipleTimes(plusOneButton, 4);
        await page.waitForFunction(waitForCounterValueToBe, {}, {value: 4, op: "eq" });
        await clickButtonMultipleTimes(toggleButton, 4);
        await widgetButton.click();

        await page.waitForFunction(waitForCounterValueToBe, {}, {value: 1, op: "eq" });

        const counterText = await page.evaluate(getCounterText);
        expect(counterText).toBe('1');
    }, 60000);

    afterAll(async () => {
        await browser.close();
    });
});
