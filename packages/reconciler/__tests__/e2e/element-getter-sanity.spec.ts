import puppeteer from 'puppeteer';
import { getPageAtUrl } from './browser-utils';

const waitForTextToBe = (value: string) => {
    const valueOnPage = Array.from(document.querySelectorAll('[data-testid="richTextElement"]'))
    .map(el => (el as HTMLElement).innerText).join('').trim();

    return value === valueOnPage;
}

const getRadioInputValues = () => {
    return Array.from(document.querySelectorAll('input[type=radio]')).map(el => (el as HTMLInputElement).value);
};

describe('getter setter sanity', () => {
    let browser: puppeteer.Browser;
    beforeAll(async () => {
        browser = await puppeteer.launch({
            // devtools: true,
            // slowMo: 100,
        });
    }, 30000);

    it('radioGroup getter shouldnt interfere with setting the property', async () => {
        const page = await getPageAtUrl(browser, 'https://yurym4.wixsite.com/react-velo-e2e/velo-element-getter-sanity');

        await page.waitForFunction(waitForTextToBe, {}, "ready");

        const radioValues = await page.evaluate(getRadioInputValues);
        expect(radioValues).toEqual(["four4","five5", "six6"]);
    }, 60000);

    afterAll(async () => {
        await browser.close();
    });
});
