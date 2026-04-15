class CssUtil {
	computedStyle: CSSStyleDeclaration;

	constructor() {
		this.computedStyle = getComputedStyle(document.documentElement);
	}

	getVarInt(variable: string) {
		return parseInt(this.computedStyle.getPropertyValue(variable), 10);
	}

	getVar(variable: string) {
		return this.computedStyle.getPropertyValue(variable);
	}
}

export default new CssUtil();
