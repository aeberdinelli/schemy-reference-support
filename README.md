# Reference support
## Introduction 
This [Schemy](https://github.com/aeberdinelli/schemy) plugin adds the functionality to reference values from within a schema using `Schemy.$ref()`.

## Install
- `npm install --save schemy-reference-support`

## Usage
Add the plugin to Schemy:

```javascript
const Schemy = require('schemy');
const SchemyReferenceSupport = require('schemy-reference-support');

// Load the plugin into Schemy
Schemy.extend(SchemyReferenceSupport);

// Now you can use Schemy.$ref(propertyName)
```

## Examples
### In property settings
We can use a previously defined property within the definition of the schema. In the following example we set the max elements for an array using the `maxItems` property.

```javascript
const schema = new Schemy({
    maxItems: {
        type: Number,
        required: true
    },
    items: {
        type: [String],
        max: Schemy.$ref('maxItems')
    }
});

schema.validate({
	maxItems: 1,
    items: ['one','two']
}); // => false

schema.getValidationErrors(); // => [ 'Property items must contain no more than 1 elements' ]
```

### Direct reference
We can also reference directly to a property if we want two properties to match. This is useful for password confirmation:

```javascript
const schema = new Schemy({
    username: String,
    password: String,
    confirm: Schemy.$ref('password')
});

schema.validate({
    username: 'schemy',
    password: 'password1',
    confirm: 'password2'
}); // => false

schema.getValidationErrors(); // => [ 'Property confirm does not match referenced value: password' ]
```


## Notes
- Requires Schemy version **>= 3.2.1**
