// https://github.com/analyzer2004/weatherwheel
// Copyright 2020 Eric Lo
export default class WeatherWheel {
    constructor(container) {
        this._container = container;
        this._g = null;

        this._year = 0;
        this._months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        this._condColors = [
            { id: "Clear", color: "#fff3b0", icon: "" },
            { id: "Partially_cloudy", color: "#e7d8c9", icon: "" },
            { id: "Overcast", color: "#ddd", icon: "" },
            { id: "Rain", color: "#98c1d9", icon: "" },
            { id: "Snow", color: "#c2dfe3", icon: "" }
        ];
        this._colors = {
            low: "#118ab2", // blue
            mid: "#ffd166", // yellow
            high: "#ef476f", // red
            avg: "#006d77", // greenish
            precipitation: "#8ecae6", // blue
            precline: "#0077b6",
            humidity: "#ddd" // gray
        };

        this._width = 640;
        this._height = 640;
        this._half = { width: 0, height: 0 };
        this._radius = {
            inner: 125,
            outer: 0,
            max: 0,
            bubble: 50,
            label: 15
        };
        this._fontSize = {
            info: 10,
            center: 24,
            month: 9,
            mark: 8,
            tick: 8
        };

        this._data = null;
        this._chartData = null;
        this._field = {
            date: "Date time",
            low: "Minimum Temperature",
            high: "Maximum Temperature",
            avg: "Temperature",
            precipitation: "Precipitation",
            humidity: "Relative Humidity",
            condition: "Conditions"
        }

        this._x = null; // date scale
        this._y = null; // temperature scale
        this._b = null; // bubble radius scale
        this._h = null; // humidity scale
        this._hc = null; // humidity color scale
        this._dayRadian = 0; // one-day radian

        this._tempUnit = "°F";
        this._precUnit = "in";
        this._currMonth = 0;
        this._yearStat = true;
        this._highlight = null;
        this._statistics = null;
        this._dailyInfo = null;
        this._texts = {
            icon: null,
            date: null,
            high: null,
            low: null,
            avg: null,
            prec: null,
            humidity: null
        };

        this._onhover = null;

        this._f = true;
        this._uniqueId = new String(Date.now() * Math.random()).replace(".", "");
    }

    size(_) {
        return arguments.length ? (this._width = _[0], this._height = _[1], this) : [this._width, this._height];
    }

    months(_) {
        return arguments.length ? (this._months = _, this) : this._months;
    }

    field(_) {
        return arguments.length ? (this._field = _, this) : this._field;
    }

    icon(_) {
        if (arguments.length) {
            this._condColors[0].icon = _.clear;
            this._condColors[1].icon = _.cloudy;
            this._condColors[2].icon = _.overcast;
            this._condColors[3].icon = _.rain;
            this._condColors[4].icon = _.snow;
            return this;
        }
        else {
            return this._condColors.map(d => d.icon);
        }
    }

    temperatureUnit(_) {
        return arguments.length ? (this._tempUnit = _, this) : this._tempUnit;
    }

    precipitationUnit(_) {
        return arguments.length ? (this._precUnit = _, this) : this._precUnit;
    }

    data(_) {
        return arguments.length ? (this._data = _, this) : this._data;
    }

    onhover(_) {
        return arguments.length ? (this._onhover = _, this) : this._onhover;
    }

    render() {
        this._init();
        this._process();

        this._g = this._container.append("g");
        this._initGradients();        

        this._initDynamicParts();
        this._renderMainWheel();
        this._showStatistics(this._chartData, this._year);
        return this;
    }

    _init() {
        const r = this._radius;
        
        r.max = Math.min(this._width, this._height) / 2;
        r.inner = r.max * 0.28;
        r.bubble = r.max * 0.12;
        r.outer = r.max - r.bubble * 2 - r.label;

        const fs = d3.scaleLinear().domain([4, 1024]).range([0, 28]);
        this._fontSize.info = fs(r.max);
        fs.range([8, 36]);
        this._fontSize.center = fs(r.max);
        fs.range([4, 18]);
        this._fontSize.month = this._fontSize.mark = this._fontSize.tick = fs(r.max);        

        this._dayRadian = 2 * Math.PI / this._data.length + Math.PI;
        this._half = { width: this._width / 2, height: this._height / 2 };
    }

    _process() {
        let getIndex = cond => {
            for (let i = 0; i < this._condColors.length; i++) {
                const c = this._condColors[i];
                if (c.id === cond) return i;
            }
            return -1;
        }

        const lows = [], highs = [], precs = [], humis = [];
        const field = this._field;
        this._chartData = this._data.map(d => {
            const date = new Date(d[field.date]);
            var cond = d[field.condition];
            cond = (cond.startsWith("Rain") ? "Rain" : cond.startsWith("Snow") ? "Snow" : cond).replaceAll(" ", "_");
            const datum = {
                dateStr: d[field.date],
                date: date,
                month: date.getMonth(),
                low: d[field.low],
                high: d[field.high],
                avg: d[field.avg],
                precipitation: d[field.precipitation],
                humidity: d[field.humidity],
                conditionIndex: getIndex(cond),
                condition: cond
            };

            lows.push(datum.low);
            highs.push(datum.high);
            precs.push(datum.precipitation);
            humis.push(datum.humidity);
            return datum;
        });

        this._year = this._chartData[0].date.getFullYear();
        this._initScales(lows, highs, precs, humis);
    }

    _initScales(lows, highs, precs, humis) {
        const d = this._chartData, r = this._radius;

        this._x = d3.scaleTime()
            .domain([d[0].date, d[d.length - 1].date])
            .range([0, 2 * Math.PI - (2 * Math.PI / d.length)]); // whole circle - last day

        this._y = d3.scaleRadial()
            .domain([d3.min(lows), d3.max(highs)]).nice()
            .range([r.inner, r.outer]);

        this._b = d3.scaleLinear()
            .domain(d3.extent(precs))
            .range([0, r.bubble]);

        const hext = d3.extent(humis);
        this._h = d3.scaleLinear()
            .domain(hext)
            .range([r.outer, r.outer + r.bubble * 0.75]);

        this._hc = d3.scaleLinear()
            .domain(hext)
            .range(["#fefefe", "#dedede"]);
    }

    _initGradients() {
        const r = this._radius, c = this._colors;

        this._g.append("linearGradient")
            .attr("id", `line_${this._uniqueId}`)
            .attr("x1", "100%")
            .attr("x2", "100%")
            .attr("y1", r.outer)
            .attr("y2", r.inner)
            .attr("gradientUnits", "userSpaceOnUse")
            .call(g => g.append("stop").attr("stop-color", c.high).attr("offset", 0))
            .call(g => g.append("stop").attr("stop-color", c.mid).attr("offset", 0.5))
            .call(g => g.append("stop").attr("stop-color", c.low).attr("offset", 1));

        this._condColors.forEach(d => this._g.append("linearGradient")
            .attr("id", `grad${d.id}_${this._uniqueId}`)
            .attr("x1", "100%")
            .attr("x2", "100%")
            .attr("y1", r.inner)
            .attr("y2", r.outer)
            .attr("gradientUnits", "userSpaceOnUse")
            .call(g => g.append("stop").attr("stop-color", d.color).attr("stop-opacity", 0).attr("offset", 0))
            .call(g => g.append("stop").attr("stop-color", d.color).attr("stop-opacity", 0.25).attr("offset", 0.33))
            .call(g => g.append("stop").attr("stop-color", d.color).attr("stop-opacity", 0.5).attr("offset", 0.66))
            .call(g => g.append("stop").attr("stop-color", d.color).attr("stop-opacity", 0.0).attr("offset", 1))
        );
    }

    _initDynamicParts() {
        const r = this._radius, half = this._half;

        this._highlight = this._g.append("g")
            .attr("opacity", 0)
            .call(g => g.append("path")
                .attr("class", "highlight")
                .attr("opacity", 0.3)
                .attr("fill", "#999")
                .attr("d", d => this._line(r.inner, r.max - r.label)));

        this._statistics = this._g.append("g")
            .attr("text-anchor", "middle")            
            .attr("transform", `translate(${half.width - r.inner - half.width},${half.height - r.inner - half.height})`)
            .call(g => g.append("circle")
                .attr("fill", "white")
                .attr("opacity", 0)
                .attr("cx", r.inner).attr("cy", r.inner)
                .attr("r", r.inner))
            .call(g => g.append("text")
                .attr("class", "label")
                .attr("font-size", this._fontSize.center)
                .attr("fill", "#aaa")
                .attr("transform", `translate(${r.inner},${r.inner})`)
                .text(this._year))
            .on("click", () => {
                this._yearStat = !this._yearStat;
                if (this._yearStat)
                    this._showStatistics(this._chartData, this._year);
                else
                    this._showStatistics(this._getMonthData(this._currMonth), this._months[this._currMonth]);
            });

        const t = this._texts, c = this._colors;
        this._dailyInfo = this._g.append("g")
            .style("visibility", "hidden")
            .attr("font-size", this._fontSize.info + "pt")
            .call(g => t.icon = g.append("image")
                .attr("width", r.inner / 2)
                .attr("opacity", 0.35)
                .attr("transform", `translate(${-r.inner / 1.3},${-r.inner / 4})`))
            .call(g => g.append("g")                
                .attr("transform", `translate(0,${-r.inner / 4})`)
                .call(g => t.date = g.append("text").attr("fill", "#aaa").text("Date: "))
                .call(g => t.high = g.append("text").attr("y", "1em").attr("fill", c.high).text("High: "))
                .call(g => t.low = g.append("text").attr("y", "2em").attr("fill", c.low).text("Low: "))
                .call(g => t.avg = g.append("text").attr("y", "3em").attr("fill", c.avg).text("Avg: "))
                .call(g => t.prec = g.append("text").attr("y", "4em").attr("fill", c.precipitation).text("Prec.: "))
                .call(g => t.humidity = g.append("text").attr("y", "5em").attr("fill", c.precipitation).text("Humidity: ")));
    }    

    _renderMainWheel() {
        this._renderWheelContent();
        this._renderAxis();
        this._renderMarks();
        this._renderOverlay();
        this._renderMonthLabels();
    }

    _renderWheelContent() {
        const r = this._radius, c = this._colors;
        const vis = this._g.selectAll(".vis").data(this._chartData);

        vis.join("g")
            .attr("class", "vis")
            .attr("transform", d => `rotate(${this._x(d.date) * 180 / Math.PI - 180})`)
            // condition
            .call(g => g.append("path")
                .attr("fill", d => `url(#grad${d.condition}_${this._uniqueId})`)
                .attr("stroke", "none")
                .attr("d", d => this._line(r.inner, r.outer)))
            // temperature
            .call(g => g.append("path")
                .attr("fill", `url(#line_${this._uniqueId})`)
                .attr("stroke", "none")
                .attr("d", d => this._line(this._y(d.low), this._y(d.high))))
            // humidity
            .call(g => g.append("path")
                .attr("fill", d => this._hc(d.humidity))
                .attr("opacity", 0.7)
                .attr("d", d => this._line(r.outer, this._h(d.humidity))));

        // precipitation bubble
        vis.join("circle")
            .attr("fill", c.precipitation)
            .attr("stroke", c.precline)
            .attr("opacity", 0.4)
            .attr("stroke-opacity", 0.7)
            .attr("cy", r.outer + r.bubble)
            .attr("r", d => this._b(d.precipitation))
            .attr("transform", d => `rotate(${this._x(d.date) * 180 / Math.PI - 180})`);

        // average line
        const lineWidth = (r.outer - r.inner) * 1.5 * Math.PI / this._chartData.length;
        this._g.append("path")
            .attr("fill", "none")
            .attr("stroke", "#006d77")
            .attr("stroke-width", lineWidth)
            .attr("stroke-opacity", 0.35)
            .attr("d", d3.lineRadial()
                .curve(d3.curveLinearClosed)
                .angle(d => this._x(d.date))
                .radius(d => this._y(d.avg))(this._chartData));
    }

    _renderAxis() {
        this._g.append("g")
            .attr("text-anchor", "end")
            .call(g => this._circle(g, this._radius.inner))
            .selectAll("g")
            .data(this._y.ticks(5).slice(0, 5))
            .join("g")
            .call(g => this._circle(g, d => this._y(d)))
            .call(g => g.append("text")
                .attr("y", d => -this._y(d))
                .attr("dx", "-0.5em")
                .attr("dy", "0.25em")
                .attr("font-size", this._fontSize.tick + "pt")
                .attr("font-weight", "bold")
                .attr("stroke", "white")
                .attr("stroke-width", 2)
                .attr("fill", "none")
                .text(d => d)
                .clone(true)
                .attr("fill", "#aaa")
                .attr("stroke", "none"));
    }

    _renderMarks() {
        const c = this._colors, r = this._radius;

        let angle = day => {
            day.angle = this._x(day.date) * 180 / Math.PI - 180; // pre-calculated degree
            day.arcStart = this._x(day.date); // rad
            day.arcEnd = day.arcStart + 2 * Math.PI; // rad
            return day;
        }

        let addMark = (id, color, y1, y2, day, innerRadius, dy, label, circle) => {
            this._g.append("g")
                .call(g => g.append("line")
                    .attr("y1", y1)
                    .attr("y2", y2)
                    .attr("stroke", color)
                    .attr("stroke-width", 0.5)
                    .attr("transform", `rotate(${day.angle})`))
                .call(g => {
                    g.append("path")
                        .attr("id", id + "_" + this._uniqueId)
                        .attr("stroke", circle ? color : "none")
                        .attr("stroke-width", 0.5)
                        .attr("stroke-opacity", 0.5)
                        .attr("stroke-dasharray", "1,2,1,2")
                        .attr("fill", "none")
                        .attr("d", this._arc(innerRadius, day.arcStart, day.arcEnd));
                    g.append("text")
                        .attr("fill", color)
                        .attr("font-size", this._fontSize.mark + "pt")
                        .attr("font-weight", "bold")
                        .attr("dx", 2)
                        .attr("dy", dy)
                        .append("textPath")
                        .attr("href", "#" + id + "_" + this._uniqueId)
                        .text(label);
                });
        }

        const
            hottest = angle(this._chartData.reduce((a, b) => a.high > b.high ? a : b)),
            coldest = angle(this._chartData.reduce((a, b) => a.low < b.low ? a : b)),
            rainiest = angle(this._chartData.reduce((a, b) => a.precipitation > b.precipitation ? a : b));

        addMark("hottest", c.high, this._y(hottest.high), this._y(hottest.high) + 10, hottest, this._y(hottest.high), -2, `${hottest.dateStr} - ${hottest.high}${this._tempUnit}`, true);
        addMark("coldest", c.low, this._y(coldest.low) - 10, this._y(coldest.low), coldest, this._y(coldest.low), "1em", `${coldest.dateStr} - ${coldest.low}${this._tempUnit}`, true);
        addMark("rainiest", c.precline, r.max - r.label, r.max - r.label - 10, rainiest, r.max - r.label - 10, 0, `${rainiest.dateStr} - ${rainiest.precipitation}${this._precUnit}`);

    }

    _renderOverlay() {
        const r = this._radius, t = this._texts;

        this._g.selectAll(".visoverlay")
            .data(this._chartData)
            .join("g")
            .attr("class", "visoverlay")
            .attr("transform", d => `rotate(${this._x(d.date) * 180 / Math.PI - 180})`) // rad 2 deg - 180 -> rotate back to 12 o'clock                
            .call(g => g.append("path")
                .attr("fill", "white")
                .attr("opacity", 0)
                .attr("d", this._line(r.inner, r.max - r.label)))
            .on("mouseenter", (e, d) => {
                if (+this._statistics.attr("opacity") === 1) {
                    this._statistics.attr("opacity", 0);
                    this._dailyInfo.style("visibility", "visible");
                }

                t.icon.attr("href", this._condColors[d.conditionIndex].icon);
                t.date.text(d.dateStr);
                t.high.text(`High: ${d.high}${this._tempUnit}`);
                t.low.text(`Low: ${d.low}${this._tempUnit}`);
                t.avg.text(`Avg: ${d.avg}${this._tempUnit}`);
                t.prec.text(`Prec.: ${d.precipitation}${this._precUnit}`);
                t.humidity.text(`Humidity: ${d.humidity}%`);

                const curr = d3.select(e.currentTarget);
                this._highlight.attr("opacity", 1)
                    .transition().duration(500)
                    .ease(d3.easeElastic)
                    .attr("transform", curr.attr("transform"));

                if (this._onhover) this._onhover(d.date);
            })
            .on("mouseleave", (e, d) => {
                this._statistics.attr("opacity", 1);
                this._dailyInfo.style("visibility", "hidden");
                this._highlight.attr("opacity", 0);
            });
    }

    _renderMonthLabels() {
        const r = this._radius;
        this._g.append("g")
            .selectAll("g")
            .data(this._months.map((d, i) => {
                const date = new Date(this._year, i, 1);
                return {
                    month: d,
                    index: i,
                    date: date,
                    rad: this._x(date),
                    angle: this._x(date) * 180 / Math.PI - 180 // pre-calculated degree of the first day of the month
                };
            }))
            .join("g")
            .attr("font-size", this._fontSize.month + "pt")
            .attr("font-weight", "bold")
            .call(g => g.append("line")
                .attr("stroke", "#aaa")
                .attr("stroke-width", 0.5)
                .attr("stroke-dasharray", "1,2,1,2")
                .attr("y1", r.inner)
                .attr("y2", r.max)
                .attr("transform", d => `rotate(${d.angle})`))
            .call(g => g.append("path")                
                .attr("stroke", "#aaa")
                .attr("stroke-width", 0.35)
                .attr("stroke-dasharray", "1,2,1,2")
                .attr("d", d => this._arc(r.max - r.label, d.rad, d.rad + Math.PI * 2 / 12 * 0.3))) // month radian * 0.3 for the month dot-lines
            .call(g => g.append("text")
                .attr("dx", 2.5)                
                .attr("dy", r.label + 17.5) // 2.5: margin-bottom
                .attr("fill", "#999")
                .append("textPath")
                .attr("href", d => "#" + d.month + "_" + this._uniqueId)
                .text(d => d.month))
            .call(g => g.append("path")
                .attr("id", d => d.month + "_" + this._uniqueId)
                .attr("fill", "white")
                .attr("opacity", 0)
                .attr("d", d => this._arc(r.max - r.label - 20, d.rad, d.rad + Math.PI * 2 / 12, r.max + 20))) // an arc covers the whole month for mouseover
            .on("mouseover", (e, d) => {
                this._yearStat = false;
                this._currMonth = d.index;
                this._showStatistics(this._getMonthData(d.index), this._months[d.index]);

                if (this._onhover) this._onhover(new Date(this._year, d.index, 1));
            });
    }

    _showStatistics(data, label) {
        const set = g => {
            g.attr("transform", d => `translate(${d.x},${d.y})`)
                .select("text")
                .attr("fill", d => d3.color(d.data.color).darker(0.75))
                .text(d => d.value);

            const c = g.select("circle");
            var t = !this._f ? c.transition().duration(250) : c;                    
            t.attr("r", d => d.r)
                .attr("fill", d => d.data.color)
                .attr("stroke", d => d3.color(d.data.color).darker(0.75))            

            return g;
        }

        this._statistics.select(".label").text(label);
        this._statistics.selectAll("g")
            .data(this._pack(data).leaves().filter(d => d.data.color !== undefined))
            .join(
                enter => {
                    return enter.append("g")
                        .call(g => g.append("circle")
                            .attr("opacity", 0.65)
                            .attr("stroke-width", 0.5))
                        .call(g => g.append("text")
                            .attr("dy", "0.25em")
                            .attr("font-size", this._fontSize.center))
                },
                update => set(update, true),
                exit => exit.remove())
            .call(g => set(g));

        this._f = false;
    }

    _line(y1, y2) {
        return d3.arc()
            .innerRadius(y1)
            .outerRadius(y2)
            .startAngle(Math.PI)
            .endAngle(this._dayRadian)();
    }

    _arc(radius, start, end, outerRadius) {
        outerRadius = outerRadius || radius;
        return d3.arc()
            .innerRadius(radius)
            .outerRadius(outerRadius)
            .startAngle(start)
            .endAngle(end)();
    }

    _circle(g, r) {
        g.append("circle")
            .attr("fill", "none")
            .attr("stroke", "#aaa")
            .attr("stroke-width", 0.5)
            .attr("stroke-dasharray", "1,2,1,2")
            .attr("r", d => typeof r === "function" ? r(d) : r);
    }

    _pack(data) {
        const counts = [], w = this._radius.inner * 2;
        const grouped = d3.group(data, d => d.conditionIndex);
        grouped.forEach((value, key) => counts.push({
            cond: key,
            count: value.length,
            color: this._condColors[key].color
        }));

        return d3.pack()
            .size([w, w])
            .padding(1)(
                d3.hierarchy({ children: counts })
                    .sum(d => d.count)
            );
    }

    _getMonthData(month) {
        return this._chartData.filter(d => d.month === month);
    }
}