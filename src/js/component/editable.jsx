'use strict';

const React = require('react');
const PropTypes = require('prop-types');
const cx = require('classnames');
const Select = require('react-select');
const InjectableComponentsEnhance = require('../enhancers/injectable-components-enhancer');

class Editable extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			editing: false,
			value: props.value
		};
	}

	componentWillReceiveProps(nextProps) {
		if(nextProps.value !== this.props.value) {
			this.setState({
				value: nextProps.value
			});
		}
	}

	async save(newValue) {
		this.cancelPending();
		
		if(this.state.value === this.props.value) {
			return;
		}

		this.props.onSave(newValue);
	}

	edit() {
		this.setState({
			editing: true
		}, () => {
			this.props.onToggle(true);
			this.input.focus();
		});
	}

	cancel() {
		this.cancelPending();
		this.setState({
			editing: false
		}, () => {
			this.props.onToggle(false);
		});
	}

	cancelPending() {
		clearTimeout(this.pending);
	}

	editHandler(ev) {
		ev && ev.preventDefault();
		if(!this.editing && this.props.editOnClick) {
			this.edit();
		}
	}

	cancelHandler(ev) {
		ev && ev.preventDefault();
		return this.cancel();
	}

	submitHandler(ev) {
		ev && ev.preventDefault();
		return this.save(this.input.value);
	}

	keyboardHandler(ev) {
		if(ev.type === 'keyup' && ev.keyCode == 27) {
			this.cancelPending();
			ev.preventDefault();
			this.cancel();
		} else if(ev.type === 'keyup' &&  ev.keyCode == 13) {
			this.save(this.input.value);
		} else if(ev.type === 'keydown' && ev.keyCode == 9) {
			this.cancelPending();
			this.save(this.input.value);
		}
	}

	changeHandler(ev) {
		ev && ev.preventDefault();
		this.setState({
			value: this.input.value
		}, this.props.onChange);
	}

	selectChangeHandler(newValue) {
		this.setState({
			value: newValue
		}, this.props.onChange);
	}

	blurHandler() {
		this.pending = setTimeout(() => {
			if(this.input) {
				if('props' in this.input) {
					this.save(this.input.props.value);
				} else {
					this.save(this.input.value);
				}
				this.cancel();
			}
		}, 100);
	}

	renderSpinner() {
		const Spinner = this.props.components['Spinner'];
		if(this.state.processing || this.props.processing) {
			return <Spinner />;
		} else {
			return null;
		}
	}

	renderControl() {
		let EditableContent = this.props.components['EditableContent'];

		if(this.state.editing) {
			if(this.props.options) {
				return <Select
							className="editable-control"
							simpleValue
							tabIndex="-1"
							clearable = { false }
							ref={ ref => this.input = ref }
							value={ this.state.value }
							isLoading={ this.props.isLoading }
							options={ this.props.options }
							onChange={ this.selectChangeHandler.bind(this) }
							onKeyDown={ ev => this.keyboardHandler(ev) }
							onBlur={ ev => this.blurHandler(ev) }
						/>;
			} else {
				return <input
							tabIndex="-1"
							type="text"
							className="editable-control"
							ref={ ref => this.input = ref }
							disabled={ this.state.processing ? 'disabled' : null }
							value={ this.state.value }
							placeholder={ this.props.placeholder }
							onChange={ ev => this.changeHandler(ev) }
							onKeyUp={ ev => this.keyboardHandler(ev) }
							onKeyDown={ ev => this.keyboardHandler(ev) }
							onBlur={ ev => this.blurHandler(ev) }
						/>;
			}
		} else {
			return (<span className="editable-value" tabIndex="0" onFocus={ this.editHandler.bind(this) }>
						{(() => {
							if(typeof this.props.children !== 'undefined') {
								return this.props.children;
							} else {
								return (
									<EditableContent
										name={ this.props.name }
										value={ this.props.displayValue || this.state.value }
									/>
								);
							}
						})()}
					</span>);
		}
	}

	render() {
		const classNames = {
			'select': this.props.options,
			'editable': true,
			'editing': this.state.editing,
			'processing': this.state.processing || this.props.processing
		};

		return (
			<span className={cx(classNames)} onClick={ ev => this.editHandler(ev) }>
				{ this.renderControl() }
				{ this.renderSpinner() }
			</span>
		);
	}
}


Editable.propTypes = {
	name: PropTypes.string,
	value: PropTypes.oneOfType([
		PropTypes.string,
		PropTypes.number
	]),
	displayValue: PropTypes.oneOfType([
		PropTypes.string,
		PropTypes.number
	]),
	processing: PropTypes.bool,
	placeholder: PropTypes.string,
	emptytext: PropTypes.string,
	onSave: PropTypes.func,
	onChange: PropTypes.func,
	onToggle: PropTypes.func,
	editOnClick: PropTypes.bool,
	options: PropTypes.array,
	isLoading: PropTypes.bool,
	children: PropTypes.node
};

Editable.defaultProps  = {
	displayValue: null,
	value: '',
	placeholder: '',
	emptytext: '',
	onSave: v => Promise.resolve(v),
	onChange: () => {},
	onToggle: () => {},
	editOnClick: true
};

module.exports = InjectableComponentsEnhance(Editable);