# Reference support
## Introduction 
This plugin adds the functionality to reference values from within a schema using `Schemy.$ref()`.

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
#### In property settings
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

In the example above, we define a property `maxItem` as a required number. Then, we set the max items for `items` to be that property. This way, since we pass `1` to `maxItems`, the schema will fail when passing more than 1 item to the array.

#### Direct reference
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
