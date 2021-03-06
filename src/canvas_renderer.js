app.CanvasRenderer = class extends app.Renderer {
    /**
     * @return {number}
     */
    static canvasRatio() {
        if (app.CanvasRenderer._canvasRatio)
            return app.CanvasRenderer._canvasRatio;
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        var devicePixelRatio = window.devicePixelRatio || 1;
        var backingStorePixelRatio = context.webkitBackingStorePixelRatio ||
                context.mozBackingStorePixelRatio ||
                context.msBackingStorePixelRatio ||
                context.oBackingStorePixelRatio ||
                context.backingStorePixelRatio || 1;
        app.CanvasRenderer._canvasRatio = devicePixelRatio / backingStorePixelRatio;
        return app.CanvasRenderer._canvasRatio;
    }

    /**
     * @return {!Element}
     */
    static createHiDPICanvas() {
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        var ratio = app.CanvasRenderer.canvasRatio();
        context.scale(ratio, ratio);
        return canvas;
    }

    /**
     * @param {!Element} canvas
     * @param {number} canvasWidth
     * @param {number} canvasHeight
     */
    static setCanvasSize(canvas, canvasWidth, canvasHeight) {
        var ratio = app.CanvasRenderer.canvasRatio();
        canvas.width = canvasWidth * ratio;
        canvas.height = canvasHeight * ratio;
        canvas.style.width = canvasWidth + "px";
        canvas.style.height = canvasHeight + "px";
        var ratio = app.CanvasRenderer.canvasRatio();
        var context = canvas.getContext('2d');
        context.scale(ratio, ratio);
    }

    /**
     * @param {number} width
     * @param {number} height
     */
    constructor(width, height) {
        super();
        this._canvas = app.CanvasRenderer.createHiDPICanvas();
        this.setSize(width, height);
        this._scale = 1;
        this._fontName = 'Arial';
        this._nameFontSize = 11;
        this._datesFontSize = 9;
        this._offset = new g.Vec(0, 0);
        this._rootFontScale = 1.8;
        this._layout = null;
        this._isDirty = false;

        /** @type {!Map<string, !Element>} */
        this._prerenderedText = new Map();
    }

    /**
     * @override
     * @return {!Element}
     */
    element() {
        return this._canvas;
    }

    /**
     * @override
     * @param {number} width
     * @param {number} height
     */
    setSize(width, height) {
        if (g.eq(this._width, width) && g.eq(this._height, height))
            return;
        this._width = width;
        this._height = height;
        app.CanvasRenderer.setCanvasSize(this._canvas, this._width, this._height);
        this._isDirty = true;
    }

    /**
     * @override
     * @return {{width: number, height: number}}
     */
    size() {
        return {width: this._width, height: this._height};
    }

    /**
     * @param {!app.Layout} layout
     */
    setLayout(layout) {
        if (this._layout === layout)
            return;
        this._layout = layout;
        this._isDirty = true;
    }

    /**
     * @param {number} scale
     */
    setRootFontScale(scale) {
        if (g.eq(scale, this._rootFontScale))
            return;
        this._rootFontScale = scale;
        this._isDirty = true;
    }

    /**
     * @return {number}
     */
    rootFontScale() {
        return this._rootFontScale;
    }

    /**
     * @param {number} scale
     */
    setScale(scale) {
        if (g.eq(scale, this._scale))
            return;
        this._scale = scale;
        this._isDirty = true;
    }

    /**
     * @override
     * @return {number}
     */
    scale() {
        return this._scale;
    }

    setDatesFormatter(formatter) {
        if (this._datesFormatter === formatter)
            return;
        this._datesFormatter = formatter;
        this._isDirtyLayout = true;
    }

    /**
     * @override
     * @param {!g.Vec} offset
     */
    setOffset(offset) {
        if (this._offset.isEqual(offset))
            return;
        this._offset = offset;
        this._isDirty = true;
    }

    /**
     * @override
     * @return {!g.Vec}
     */
    offset() {
        return this._offset;
    }

    /**
     * @param {number} fontSize
     */
    setNameFontSize(fontSize) {
        if (g.eq(fontSize, this._nameFontSize))
            return;
        this._prerenderedText.clear();
        this._nameFontSize = fontSize;
        this._isDirty = true;
    }

    /**
     * @return {number}
     */
    nameFontSize() {
        return this._nameFontSize;
    }

    /**
     * @param {number} fontSize
     */
    setDatesFontSize(fontSize) {
        if (g.eq(fontSize, this._datesFontSize))
            return;
        this._prerenderedText.clear();
        this._datesFontSize = fontSize;
        this._isDirty = true;
    }

    /**
     * @return {number}
     */
    datesFontSize() {
        return this._datesFontSize;
    }

    /**
     * @param {string} text
     * @return {?Element}
     */
    _prerenderText(text, color, fontName, fontSize) {
        if (!text)
            return null;
        var id = text + "$$" + color + "$$" + fontName + "$$" + fontSize;
        var render = this._prerenderedText.get(id);
        if (render)
            return render;

        render = app.CanvasRenderer.createHiDPICanvas();
        var mainCtx = this._canvas.getContext('2d');
        var font = fontSize + 'px ' + fontName;
        mainCtx.font = font;
        var metrics = mainCtx.measureText(text);
        app.CanvasRenderer.setCanvasSize(render, metrics.width, fontSize + 5);
        var ctx = render.getContext('2d');
        ctx.font = fontSize + 'px ' + fontName;
        ctx.fillStyle = color;
        ctx.textBaseline = 'top';
        ctx.fillText(text, 0, 2);
        this._prerenderedText.set(id, render);
        return render;
    }

    /**
     * @override
     */
    render() {
        if (!this._isDirty)
            return;
        this._isDirty = false;
        var ctx = this._canvas.getContext('2d');
        ctx.save();
        ctx.clearRect(0, 0, this._width, this._height);
        ctx.translate(this._width / 2, this._height / 2);
        ctx.translate(this._offset.x, this._offset.y);
        ctx.scale(this._scale, this._scale);

        if (this._layout.backgroundImage) {
            var img = this._layout.backgroundImage;
            ctx.drawImage(img.image, img.topLeft.x, img.topLeft.y);
        }

        this._renderScaffolding(ctx, this._layout.scaffolding);

        for (var person of this._layout.positions.keys())
            this._renderPerson(ctx, this._layout, person);
        ctx.restore();
    }

    _font() {
        return this._fontSize + 'px Arial';
    }

    /**
     * @param {!CanvasRenderingContext2D} ctx
     * @param {!app.Layout} layout
     */
    _renderScaffolding(ctx, scaffolding) {
        ctx.beginPath();
        for (var shape of scaffolding) {
            if (shape instanceof g.Line) {
                var line = /** @type {!g.Line} */(shape);
                ctx.moveTo(line.from.x, line.from.y);
                ctx.lineTo(line.to.x, line.to.y);
            } else if (shape instanceof g.Arc) {
                var arc = /** @type {!g.Arc} */(shape);
                ctx.moveTo(arc.from.x, arc.from.y);
                ctx.arc(arc.center.x, arc.center.y, arc.r, arc.fromAngle, arc.toAngle, false);
            } else if (shape instanceof g.Bezier) {
                var bezier = /** @type {!g.Bezier} */(shape);
                ctx.moveTo(bezier.from.x, bezier.from.y);
                ctx.quadraticCurveTo(bezier.cp.x, bezier.cp.y, bezier.to.x, bezier.to.y);
            }
        }
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'darkgray';
        ctx.stroke();
    }

    createPersonIcon(size, gender, isChild, isDeceased) {
        var canvas = app.CanvasRenderer.createHiDPICanvas();
        app.CanvasRenderer.setCanvasSize(canvas, size, size);
        var ctx = canvas.getContext('2d');
        var radius = (size / 2)|0;
        this._renderPersonCircle(ctx, new g.Vec(radius, radius), radius, false, gender, isChild, isDeceased);
        return canvas;
    }

    _renderPersonCircle(ctx, position, radius, isRoot, gender, isChild, isDeceased) {
        var color = 'gray';
        var alpha = isDeceased ? 0.5 : 1;
        if (isRoot)
            color = `rgba(231, 174, 68, ${alpha})`;
        else if (gender === app.Gender.Male)
            color = `rgba(142, 178, 189, ${alpha})`;
        else if (gender === app.Gender.Female)
            color = `rgba(232, 144, 150, ${alpha})`;

        this._clearCircle(ctx, position.x, position.y, radius);
        ctx.beginPath();
        ctx.moveTo(position.x + radius, position.y);
        if (isChild) {
            ctx.lineWidth = Math.ceil(0.146 * radius);
            ctx.strokeStyle = color;
            ctx.arc(position.x, position.y, radius - ((ctx.lineWidth / 2)|0), 0, 2*Math.PI);
            ctx.stroke();
        } else {
            ctx.arc(position.x, position.y, radius, 0, 2*Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
        }
    }

    /**
     * @param {!CanvasRenderingContext2D} ctx
     * @param {!app.Layout} layout
     * @param {!app.Person} person
     */
    _renderPerson(ctx, layout, person) {
        var position = layout.positions.get(person);
        var personRadius = layout.personRadius;

        this._renderPersonCircle(ctx, position, personRadius, person === layout.root, person.gender, person.isChild(), person.deceased);

        var rotation = g.normalizeRad(layout.rotations.get(person));
        var cumulativeRotation = g.normalizeRad(rotation);
        var textOnLeft = cumulativeRotation > Math.PI / 2 && cumulativeRotation < 3 * Math.PI / 2;
        if (textOnLeft)
            rotation -= Math.PI;

        ctx.save();
        ctx.translate(position.x, position.y);
        var color = `rgba(48, 48, 48, ${person.deceased ? 0.5 : 1}`;
        var textPadding = 6;
        if (person === layout.root) {
            var fullName = this._prerenderText(person.fullName(), color, this._fontName, this._nameFontSize * this._rootFontScale);
            var dates = this._prerenderText(this._datesFormatter(person), color, this._fontName, this._datesFontSize * this._rootFontScale);
            this._drawImage(ctx, fullName, -fullName.width / 2, personRadius);
            this._drawImage(ctx, dates, -dates.width / 2, personRadius + fullName.height);
        } else {
            ctx.rotate(rotation);
            var fullName = this._prerenderText(person.fullName(), color, this._fontName, this._nameFontSize);
            var dates = this._prerenderText(this._datesFormatter(person), color, this._fontName, this._datesFontSize);
            if (textOnLeft) {
                var textWidth = fullName.width;
                this._drawImage(ctx, fullName, -personRadius - textPadding - textWidth, -fullName.height);
                textWidth = dates ? dates.width : 0;
                this._drawImage(ctx, dates, -personRadius - textPadding - textWidth, 0);
            } else {
                this._drawImage(ctx, fullName, personRadius + textPadding, -fullName.height);
                this._drawImage(ctx, dates, personRadius + textPadding, 0);
            }
        }
        ctx.restore();
    }

    _drawImage(ctx, image, x, y) {
        if (!image)
            return;
        ctx.drawImage(image, x, y);
    }

    _clearCircle(ctx, x, y, radius) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2*Math.PI, true);
        ctx.clip();
        ctx.clearRect(x - radius, y - radius, radius*2 , radius*2);
        ctx.restore();
    }
}

