### The Reason for Jess

Less and Sass are powerful tools to create styles. Then came reactive front-end component development. We wanted modules, and we wanted scoped CSS. So we created CSS modules. But what about dynamic modules? So we tried to put CSS in JavaScript.

But what if your stylesheets:

1. Could be in stylesheets, like CSS, Less, and Sass.
2. Could be JS modules, like CSS modules.
3. Could be completely dynamic when it needed to be, like CSS-in-JS, or Less in the browser.

Instead of having a whole programming language just for your stylesheet, like the Sass language, why not use a programming language we're already using for everything else, that's designed to compile quickly and efficiently? Why not just use JavaScript?

Instead of putting CSS in your JavaScript, why not put JavaScript in your CSS?


First, like Less or Sass, a valid `.css` file is a valid `.jess` file.
```less
// box.jess

.box {
  color: red;
}
```

However, unlike Less/Sass, this doesn't immediately transpile to CSS. Instead, it transpiles to an intermediate JS module,
which will look something like:
```js
const def = () => {
  return {
    css: [`
      .box {
        color: red;
      }
    `],
    box: 'box'
  }
}

export default def
```

So far, so good. It looks something like a CSS module. Big deal.

However, the Jess file itself allows you to import other modules. Unlike Sass and Less, these can be any other JS module, or another Jess file, using `@import` for either.

### Imports

Here's an example:

```less
@import {colors} from './constants.js';
```
How would you use that? You can imagine the rest of the file as a JS template block, wrapped in ``` `` ``` characters. You could think of it like Styled Components or Emotion, but in a dedicated stylesheet, and just a bit easier to work with.

Because your `.jess` file is essentially like a template file, you can use `$[]` expressions in your styles to evaluate a JS expression and output a string.

For instance:

```less
@import {colors} from './constants.js';

.box {
  color: $[colors.foreground];
}
```
```js
import * as J from 'jess';
import {colors} from './constants.js';

export default J.rules($ => {
  J.rule({
    sel: [J.sel('.box')],
    rules($) {
      $.add('color', [colors.foreground])
    }
  })
}
```


_Define rules?_

If your JS expression is continuous, you can use the `$` without `[]`, as in:
```less
@import {colors} from './constants.js';

.box {
  color: $colors.foreground;
}
```

### Variables

In Jess, you can also declare variables inline with `@const` (and `@let`, which will be explained later). But those variables will have the following special properties:

1. They are immutable (even `@let`) per stylesheet evaluation.
2. By default, they evaluate the assigned value as a CSS value (but can be assigned JS expressions).
3. Root variables will be auto-exported from the generated module.
4. They have a single value per scope evaluation.
5. They are hoisted to the top of the scope block.

Let's see a basic example.

```less
@let blockType: inline;
```
Any variable declared in a Jess file is a CSS value that can be implicitly converted to a string or value. It's still just a JS object.

```js
export const chooseFloat = (block) => {
  return block == 'inline' ? 'left' : 'right';
};
```
```less
@import { chooseFloat } from 'mixin.js';
@let blockType: inline;

.box {
  display: $chooseFloat(blockType);
}
```
In simplified terms, this will return what you would expect, a template string that looks like:
```js
// this is an oversimplification of output code, but demonstrates the 1-to-1 relationship with JS
const blockType = Jess.Keyword('inline')

return `.box {
  display: ${blockType == 'inline' ? 'inline' : 'block'};                 
}`
```
_Note: this isn't what the "final" `<style>` tag will look like returned to your component or stylesheet,
as Jess will do a number of other optimizations to create efficient style injection. See: Advanced (TODO)_

#### Rules for Jess variables

Variables declared in Jess must be a literal JS type (a string, number, boolean, array, or plain object), or a CSS type (keyword, space-separated list, comma-separated list, dimension, color). You can't assign variables to function definitions, or special collection types like `Map` or `Set`.

#### Evaluating JS in Jess values

You can use a `$` or `$[]` expression to evaluate to a value in Jess. As in:

```less
@let blockType: $['inline'];
```

#### Evaluating CSS in JS expressions

For convenience, you can use `<>` to evaluate something as a simple CSS value in a JS expression. For example:

```less
.box {
  background-color: $mix(<#FF0>, <#3F0>, 0.5);
}
```

#### Dynamic Runtime evaluation

_To be explained in detail elsewhere_

Anything that references a Jess expression can be re-computed / updated
in the browser at runtime. Meaning: Jess will create static CSS and JS
as output.



```less
// theme.jess
@import { mix } from 'jess/color';

@let colors {
  background: #000;
  foreground: #FFF;
  halfway: $mix(colors.background, colors.foreground, 0.5);
}
```
```less
@import { colors } from './theme.jess';

.box {
  color: $colors.halfway;
}
```

### Theming

```less
// library/theme.jess
@import { mix } from 'jess/functions';

@let themeColor: blue;
@let colors {
  darkTheme: $mix(themeColor, <white>, <50%>);
}

// main.jess
@import css from 'library/theme.jess';

@let theme {
  themeColor: red
}
@let colors: $css(theme).colors;

.box {
  color: $colors.darkTheme;
}
```
Output is:
```less
.box {
  color: #660000;
}
```

_TODO: Rewrite to show classes are regenerated_

```js
import {mix} from 'jess/functions';
// ...
['--box-color', () => mix(colors.background, colors.foreground, 0.5)]
// ... does stuff
```
... as part of the JavaScript bundle.


#### Creating a custom theme

You can simplify the above and create a custom theme by passing new values into the theme stylesheet, like:
```less
// my-theme.jess
@import css from 'library/theme.jess';
@import * as colors from './colors.jess';
@import * as otherVars from './vars.jess';

@let theme: $css({...colors, ...otherVars});

// main.jess
@import { theme } from './my-theme.jess';

.box {
  color: $[theme.color]; // or $theme.color
}
```

#### Variable Rules for JS expressions

_TODO: eliminate so that anything can be regenerated_

An `$[]` expression can appear almost anywhere, but only declaration values can have JS expressions that refer to `@let` variables. This is because the CSS must be able to be parsed at compile-time for static analysis of class names and values that will change, and to flatten any nested rules.

#### Variables from JavaScript modules

Any values imported from other JS modules are considered to be `const` and will be evaluated at compile-time only. As in, if we have this JS file:
```js
// colors.js
export let someColor = '#AAA';
```
... and then import it...
```less
@import {someColor} from './colors.js';

.box {
  color: $someColor;
}
```
Output is static at compile-time:
```less
.box {
  color: #AAA;
}
```

#### Lists

You can define list values like so:

```less
@let list: 50px, 100px, 200px;
```

...Which you could use like...
```less
@each list (value, index) { 
  .col-$[index + 1] {
    width: $value;
  }
}
```
It's really your preference how you want to write templating functions.

With the above, you would end up with styles like:
```css
.col-1 {
  width: 50px;
}
.col-2 {
  width: 100px;
}
.col-3 {
  width: 200px;
}
```

### Migrating from Sass / Less

#### Nesting

To make migration / code compatibility easier, like Less and Sass, Jess supports basic CSS + Nesting.
```less
.button {
  color: red;
  &:hover {
    color: blue;
  }
}
```
But, you may want to separate these styles out to support platforms like React Native. As in:
```less
@let hover: false;
@let button {
  color: $[hover ? <red> : <blue>];
}
```

```less
@let screenWidth: 640;

.button {
  padding: $[screenWidth < 800 ? <20px> : <40px>];
}
```

#### Variables

Variables are very similar to Less / Sass, with the only difference in Jess being they need to follow JS identifier rules (because they need to be parseable, valid JS exports)

```less
// Less variable
@color-brand: #AAAAFC;

// Sass variable
$color-brand: #AAAAFC;

// Jess variable.
@let colorBrand: #AAAAFC;
```

Unlike Sass / Less, Jess variables don't "leak" across imports. Jess imports follow the rules of ES6 imports, which has the benefit of meaning that evaluation is much faster, IDEs can implement code-completion on variables, and there are fewer side effects.

If you want a variable from another `.jess` stylesheet, you need to `@import` it.

```less
@import { colorBrand } from './variables.jess';

// ...
color: $colorBrand;
```
#### Maps

You can write "maps" similar to the way you would write rulesets, and similar to the "detached rulesets" feature in Less.

```less
@let colors {
  background: #000;
  foreground: #FFF;
}
```

This is the same as writing:
```less
@let colors: $[{
  background: <#000>,
  foreground: <#FFF>,
}];
```
To break down the above assignment, the outer `$[]` is a JS expression, and it contains a plain JS object surrounded with `{}`. Because it's in a JS context, the CSS values are surrounded with `<>`.

Either way, it may be referenced like this:
```less
.box {
  color: $colors.foreground;
}
```

#### Mixins / Functions

You can easily define the equivalent of a "mixin" by writing a normal function.

```js
// functions.js
export const square = (size) => ({
  width: {value: size, unit: 'px'},
  height: {value: size, unit: 'px'}
})
```

```less
@import {square} from './functions.js';

.box {
  @include square(50);
}
```

However, for syntactic convenience, you can write: 
```less
@mixin square (size) {
  width: $size;
  height: $size;
}
.box {
  @include square(50);
}
```
Note that the above mixin is essentially the same as the JS export! In fact, you could have done:
```less
@import {square} from './mixins.jess';

.box {
  @include square(50);
}
```

**Similarly, functions are just as easy**

You can just use JS functions!
```js
// calcPercent.js
export function calcPercent(target, container) {
  return {value: (target / container) * 100, unit: '%'};
}
```
```less
@import {calcPercent} from './calcPercent.js';

.my-module {
  width: $calcPercent(650, 1000);
}
```

Want to add color functions? You don't need Jess to do it for you. You don't need special Jess plugins of any kind. Try any number of JavaScript NPM modules, such as:
```
npm install color
```

```less
@import { Color } from 'color';
@import { Theme } from './constants.js';

.box {
  background: $Color(Theme.main).mix(Color(<#000000>), 0.5);
}
```
This will evaluate at compile time, and you'll end up with something like:
```css
.box {
  background: #ec0233;
}
```
_TODO: REWRITE_

For convenience, Jess has `each`, `for`, and `if` helpers. For example:

```less
@let list: 50px, 100px, 200px;

@each list (value, index) {
  .col-$[index + 1] {
    width: $value;
  }
}
```

### Using Jess in components

So far, all the examples have demonstrated how to create essentially static CSS. The JavaScript is evaluated at compile-time, and either used as a `.css` in a `<link>` tag or as `<style>` HTML injected with your component.

When you're expose a `@let` variable, what it is is a kind of state property used to create dynamic styling. This makes Jess more powerful than straight CSS modules.

```less
// main.jess

// state variable
@let color: red;

@let box {
  background: white;
  color: $color;
}
```

In your component:
```jsx
import styles from './main.jess'

const MyComponent = props => {
  const style = styles({color: props.color})
  <div className={style.box} />
}

export default MyComponent
```
Using in React Native:

In React Native, you would use the export like this:
```jsx
import styles from './main.jess'

const MyComponent = props => {
  const style = styles({color: props.color})
  <View style={style.box} />
}

export default MyComponent
```
### Hang on, what did I just see

Yeah dude, the export is an object with a `.toString()` method that outputs a class name. But it really is otherwise a plain style object with camel-case properties.


### Dynamic style updates

_TODO: Rewrite -- class names should be dynamic_

Without getting into specifics, Jess will create a diff between updated styles and patch your local
browser styles.

```
.box {
  background: black;
  color: white;
}
```