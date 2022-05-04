# React Velo
Add the ability to use native React APIs (components and hooks) to Velo, by creating a React structure which corresponds to dynamic elements in the editor.
React Velo supports React native APIs (`ref` supports only ref callback syntax and has a slightly different API), 

## Installation
This module is aimed to be used in Wix Velo environment.
1. Open a Wix Site
2. Enable Dev Mode
3. Add `@wix/react-velo` npm module

![velo-sources-panel.png](docs/assets/velo-sources-panel.png)

## Usage Example
Given a site with the following elements (and their Velo IDs),
![simple-example.png](docs/assets/simple-example.png)

A Velo User can control these elements the behavior, style and content using the following React Velo code<br>

```javascript
import React, { useState } from 'react';
import { render, W } from '@wix/react-velo';

const App = () => {
	const [background, setBackground] = useState('green');
	return (
		<>
			<W.myContainer style={{backgroundColor: background}}>
				<W.title text={'Click to change background'} />
				<W.okButton onClick={() => setBackground('Red')} />
			</W.myContainer>
		</>
	)
}

$w.onReady(function () {
	render(App, $w, React);
});
```

## API
### Module Exports
| Member 	 | Type  	 | Description  	                                                                                                                                                                                                                                                                                                                  |
|----------|---------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 	render  | Method	 | The method which initiates the link between the editor elements and the react component which represents their behavior.<br> It should be invoked in `$w.onReady` method	                                                                                                                                                       |
| 	W       | Object	 | An object representing the Wix Editor/ Editor X elements such that `W.<id>` is a React representation of the Editor element in this page. The returned component's props are identical to the Velo representation of the Element returned by using `$w(<id>)`.<br> For exact props and usages, see [Wix Editor Elements ($w)](https://www.wix.com/velo/reference/$w) API |


#### Render method
`render(Component, $w, React, callback?)`

| Member 	   | Type  	     | Description  	                                                                                                                                |
|------------|-------------|-----------------------------------------------------------------------------------------------------------------------------------------------|
| 	Component | Method	     | The React component root	                                                                                                                     |
| 	$w        | $w	         | The Wix query element provided in a page API	                                                                                                 |
| 	React     | React Instance	 | The React instance used in this page, in order to assure that `react-velo` is using the same React version as the hosting page	               |
| 	callback  | () => void | *(Optional)* A callback to be passed to the react-velo `react-reconsiler` implementation, see [React Reconsiler documentation](https://github.com/facebook/react/tree/main/packages/react-reconciler) for more details |                                                                                                                             |

#### Repeaters
A [Repeater](https://www.wix.com/velo/reference/$w/repeater) is a special Wix Editor Element which is responsible to generate a list of elements from either a data-set (dynamic) or an array set by Velo code).
In order to provide a React component API, React Velo creates a specialized react component which allows controlling the rendering of each item using a `renderItem` prop, as seen in the following example:

Given A following page with a repeater
![repeater-example.png](docs/assets/repeater-example.png)

It's React implementation can be controlled using the following code
```javascript
const App = () => {
    const [todos, setTodos] = useState([{
        desciption: 'Item 1',
        status: 'In Progress',
    }, {
        desciption: 'Item 2',
        status: 'Done',
    }]);
    // Actions to control the list can be added
    return <W.TodoList data={todos} renderItem={({ description, status }) => (
        <>
            <W.Description text={description}/>
            <W.Status text={status}/>
        </>
    )}/>
}
```
##### Repeater Component API

| prop 	      | Type  	            | Description  	                                                              |
|-------------|--------------------|-----------------------------------------------------------------------------|
| 	data       | Array	             | The data to be used by the repeater, similar to `$w('#TodoList').data`	     |
| 	renderItem | (itemData) => void | The representation of each item, similarly to `$w('#TodoList').onItemReady` |
