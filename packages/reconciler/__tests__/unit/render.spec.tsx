import React from 'react';
import { render } from '../../src/render';

describe('render sanity', () => {

    it('should return an instance and the map should be updated', () => {
        const $w = jest.fn(() => ({}));
        //@ts-expect-error
        const App = () => <div><button id="someButtonId" label="hello from button!" /></div>;
        render(App, $w, React);
    });
});
