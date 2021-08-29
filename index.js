const Plugin = {
	pluginName: 'schemy-reference-support',

	// Required Schemy version
	requiredVersion: '3.2.1',

	// Things where you can reference other schema properties
	availableRefs: ['min', 'max', 'regex'],

	versionCheck() {
        if (!Plugin.Schemy || !Plugin.Schemy.getVersion) {
            throw new Error(
                `Schemy object is not currently available within the plugin. Check you are using schemy version ${Plugin.requiredVersion} or above`
            );
        }

        const [ major, minor ] = Plugin.Schemy.getVersion().split(/\./g).map(value => parseInt(value));
        const [ reqMajor, reqMinor ] = Plugin.requiredVersion.split(/\./g).map(value => parseInt(value));

        if (major < reqMajor || (major === reqMajor && minor < reqMinor)) {
            throw new Error(`Child Settings plugin requires schemy version ${Plugin.requiredVersion} or above`);
        }
    },

	parseReferenceName(str) {
		return str.substr(5);
	},

	isReference(str) {
		return str.startsWith('$ref.');
	},

	pluginsInitialized(plugins) {
		// Initialize plugin only once
		if (!plugins.some(plugin => plugin.pluginName === Plugin.pluginName)) {
			return;
		}

		// Check compatibility
		Plugin.versionCheck();

		Plugin.Schemy.$ref = (property, data = null) => {
			if (data) {
				let value = null;

				property = Plugin.parseReferenceName(property);

				try {
					value = eval(`data.${property}`);
				} catch (err) {
					throw `Could not get referenced value ${property}`;
				}

				return value;
			}

			return `$ref.${property}`;
		};
	},

	/**
	 * This is the same logic as the parsing method from Schemy
	 * The only difference is that we allow Schemy.$ref inside the schema now
	 */
	beforeParse(schema) {
		// Always check compatibility
		Plugin.versionCheck();

		// Prevent schema from being parsed twice
		this.schemaParsed = true;

		for (var [key, properties] of Object.entries(schema)) {
			if (key !== 'required' && !properties.type) {
				if (typeof properties === 'function' || properties === 'uuid/v1' || properties === 'uuid/v4') {
					schema[key] = { type: properties, required: true };
				}
				
				else if (typeof properties === 'object') {
					try {
						const parsed = {};

						if (schema[key].custom) {
							const { custom } = schema[key];
							parsed.custom = custom;
						}

						parsed.type = new Plugin.Schemy(properties);
						parsed.required = !!properties.required;

						schema[key] = parsed;
					} catch (err) {
						throw `Could not parse property ${key} as schema`;
					}
				}

				else if (typeof properties === 'string' && Plugin.isReference(properties)) {
					// This property links directly to another property from the schema
					// Ignore other validations at parsing time
				}
			}

			else if (typeof properties.type === 'function') {
				if (['boolean','string','number','object','function'].indexOf(typeof properties.type()) === -1) {
					throw `Unsupported type on ${key}: ${typeof properties.type()}`;
				}

				if (typeof properties.type() !== 'string' && (properties.enum || properties.regex)) {
					throw `Invalid schema for ${key}: regex and enum can be set only for strings`;
				}

				if (properties.regex && !(properties.regex instanceof RegExp) && !Plugin.isReference(properties.regex)) {
					throw `Invalid schema for ${key}: regex must be an instance of RegExp`;
				}

				if (properties.min && typeof properties.min !== 'number' && !Plugin.isReference(properties.min)) {
					throw `Invalid schema for ${key}: min property must be a number`;
				}

				if (properties.max && typeof properties.max !== 'number' && !Plugin.isReference(properties.max)) {
					throw `Invalid schema for ${key}: max property must be a number`;
				}
			}

			else if (typeof properties.type === 'string' && ['uuid/v1','uuid/v4'].indexOf(properties.type) === -1 && !Plugin.isReference(properties.type)) {
				throw `Unsupported type on ${key}: ${properties.type}`;
			}

			else if (typeof properties.type === 'object' && Array.isArray(properties.type)) {
				if (properties.type.length > 1) {
					throw `Invalid schema for ${key}. Array items must be declared of any type, or just one type: [String], [Number]`;
				}

				// Auto parse array item as schemy
				if (typeof properties.type[0] === 'object') {
					if (typeof properties.type[0].validate === 'undefined') {
						properties.type[0] = new Plugin.Schemy(properties.type[0]);
					}
				}
			}

			// Parse child schema and keep custom validator if it exists
			else if (typeof properties.type === 'object' && (typeof properties.type.validate === 'undefined')) {
				try {
					const parsed = {};

					if (schema[key].custom) {
						const { custom } = schema[key];
						parsed.custom = custom;
					}

					parsed.type = new Plugin.Schemy(properties.type);
					parsed.required = !!properties.required;

					schema[key] = parsed;
				} catch (err) {}
			}

			if (properties.custom && typeof properties.custom !== 'function') {
				throw `Custom validator for ${key} must be a function, was ${typeof properties.custom}`;
			}
		}
	},

	/**
	 * Fill the referenced values before validating
	 * Also: performs a validation for directly linked properties:
	 */
	beforeValidate(data) {
		Plugin.versionCheck();

		if (!this.validationErrors) {
			this.validationErrors = [];
		}

		if (!data || typeof data !== 'object') {
			this.validationErrors.push('Data passed to validate is incorrect. It must be an object.');
			return false;
		}

		for (var [key, properties] of Object.entries(this.schema)) {
			if (typeof properties === 'string' || typeof properties.type === 'string') {
				const reference = (typeof properties.type === 'string') ? properties.type : properties;

				if (Plugin.isReference(reference)) {
					const referencedPropertyName = Plugin.parseReferenceName(reference);
					const referencedValue = Plugin.Schemy.$ref(reference, data);

					// Check if property is directly linked to another one and test for a match
					if (data[key] !== referencedValue) {
						this.validationErrors.push(`Property ${key} does not match referenced value: ${referencedPropertyName}`);
					}
					
					continue;
				}
			}

			Plugin.availableRefs.forEach(ref => {
				if (properties[ref]) {
					properties[ref] = Plugin.Schemy.$ref(properties[ref], data);
				}
			});
		}
	}
}

module.exports = Plugin;