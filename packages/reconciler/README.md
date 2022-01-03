# react-velo
```es6
import React from 'react'; // import react for JSX transpilation
import { render } from '@wix/react-velo'; // import this library

const App = () => <div id="button1" label="hello" />; // reference your UI components by `id` attribute
$w.onReady(function () {
	render(App, $w); // render must be called onReady.
});
```


### More complicated example
An example with repeater:
```es6
import React from "react";

interface TodoItem {
    _id: string;
    description: string;
    completed: boolean;
}

function TodoItem(props: { item: TodoItem, onDelete: (id: string) => void, onEdit: (id: string, description: string) => void, onComplete: (id: string) => void }) {
    const [isEditing, setEditMode] = React.useState(false);

    function handleTaskInput(ev) {
        if (ev.key === 'Enter') {
			props.onEdit(props.item._id, ev.target.value);
			ev.target.value = '';
            setEditMode(false);
		}
    }


    return <li>
        <input id="taskCheckbox" type="checkbox" checked={props.item.completed} onChange={(ev) => props.onComplete(props.item._id, ev.target.checked)} />
        {
            isEditing ?
                <input id="editTask" type="text" value={props.item.description} onKeyPress={handleTaskInput} />
                : <div id="taskText" text={`#${props.item._id} ${props.item.description}`} onDblClick={() => setEditMode(true)} />
        }
        <button id="delete" text="X" onClick={() => props.onDelete(props.item._id)} />
    </li>;
}

let nextId = 0;

const FILTER_MAP = {
    'all': () => true,
    'active': (todo: TodoItem) => !todo.completed,
    'completed': (todo: TodoItem) => todo.completed
};

export default function App() {
    const [data, setData] = React.useState<TodoItem[]>([
        { _id: `${++nextId}`, description: 'Task 1', completed: true },
        { _id: `${++nextId}`, description: 'Task 2', completed: true },
        { _id: `${++nextId}`, description: 'Task 3', completed: false },
    ]);

    const [filter, setFilter] = React.useState('all');

    function handleTaskInput(ev) {
        if (ev.key === 'Enter') {
			setData([...data, { _id: `${++nextId}`, description: ev.target.value, completed: nextId % 2 === 0 }]);
			ev.target.value = '';
		}
    }

    function handleDelete(id: string) {
        setData(data.filter(todo => todo._id !== id));
    }

    function handleComplete(id: string, completed: boolean) {
        setData(data.map((todo: TodoItem) => todo._id === id ? { ...todo, completed: completed } : todo));   
    }

    function handleEdit(id: string, description: string) {
        setData(data.map((todo: TodoItem) => todo._id === id ? { ...todo, description: description } : todo));
    }

    function clearCompleted() {
        setData(data.filter(todo => !todo.completed));
    }

    function toggleAll(completed: boolean) {
        setData(data.map(todo => ({ ...todo, completed })));
    }
                
    return <>
        <input id="taskInput" type="text" onKeyPress={handleTaskInput}  />
        <input id="checkAll" type="checkbox" checked={data.every(i => i.completed)} onChange={(ev) => toggleAll(ev.target.checked)} />
        <repeater id="taskList">
            {data.filter(FILTER_MAP[filter]).map(item => <TodoItem item={item} onDelete={handleDelete} onComplete={handleComplete} onEdit={handleEdit} />)}
        </repeater>
        
        <div id="left" text={`${data.filter(t => !t.completed).length} tasks left`} />

        <button id="allFilter" label="All" {...(filter === 'all' ? {'style': {'borderColor': 'red'}} : {})} onClick={() => setFilter('all')} />
        <button id="activeFilter" label="Active" {...(filter === 'active' ? {'style': {'borderColor': 'red'}} : {})} onClick={() => setFilter('active')} />
        <button id="completedFilter" label="Completed" {...(filter === 'completed' ? {'style': {'borderColor': 'red'}} : {})} onClick={() => setFilter('completed')} />
        
        <button id="clear" label="Clear Completed" onClick={clearCompleted} />
    </>;
}
```


# Development
`yarn run esbuild`
`yarn serve`

in velo:
```es6
import React, { useState } from 'react';
self.React = React;
importScripts('http://localhost:9080/react-velo-bundle.js');

function App() {
  const [count, setCount] = useState(0);
  return (
    <>
		<label id="counter" label={`${count}`}/>
    	<button id="increment" onClick={() => setCount(count + 1)}/>
    	<button id="decrement" onClick={() => setCount(count - 1)}/>
		{count % 10 === 0 ? <div id="box"/> : null}
    </>
  );
}

$w.onReady(function () {
  const global = Function('return this')();
  console.log('this is global?', global === self);
	reactVelo.render(App, $w);
});
```