# Weather Wheel

The **WeatherWheel** is a compound radial chart that visualizes the most important weather information. It presents the daily temperature trend using the bar and line chart with two marks identifying the hottest and coldest days of the year. The different colors in the background indicate the weather conditions. Precipitation and humidity are in the outer ring; you can also find a mark that points out the rainiest day of the year.

Typically, the center circle is filled with chart legend or just left blank, but it is actually a very suitable place for showing additional information. By default, the center of the wheel shows bubbles that represent the statistics of yearly weather conditions. As the user hovers over the month labels, it displays the monthly statistic instead ***(Click any part of the center to switch between yearly/monthly statistics)***. The center circle also works as a display; it shows daily weather data as the user hovers over any other part of the chart.

**For a live demo, see [Sunny day, rainy day in Seattle](https://observablehq.com/@analyzer2004/sunny-day-rainy-day-in-seattle).**

# API Reference

The WeatherWheel visualizes yearly weather data into a beautiful interactive compound radial chart. It accepts dataset with date, low/high/average temperatures, precipitation, humidity, and condition. The size of all elements is dynamically calculated based on the diameter of the wheel, which ensures those elements won't overlap, even when the wheel gets smaller.

* **WeatherWheel(container)** - Constructs a new WeatherWheel with default settings. The container can be a svg or any g element.
* **size([width, height])** - Sets the wheel's dimensions to specified width and height and returns this chart.
* **months(months)** - Sets the month names to be used when displaying the month ticks and returns this chart. Default is English months.
* **field(field)** - Sets the field names for parsing weather data and returns this chart. 
  * field.**date** - the field name of date
  * field.**low** - the field name of low temperature
  * field.**high** - the field name of high temperature
  * field.**avg** - the field name of average temperature
  * field.**precipitation** - the field name of precipitation
  * field.**humidity** - the field name of humidity
  * field.**condition** the field name of weather condition
* **icon(icon)** - Sets the icon for each weather condition and returns this chart.
  * icon.**clear** - the url of clear icon
  * icon.**cloudy** - the url of cloudy icon
  * icon.**overcast** - the url of overcast icon
  * icon.**rain** - the url of rain icon
  * icon.**snow** - the url of snow icon
* **temperatureUnit(unit)** - Sets the unit of temperature and returns this chart. Default is fahrenfeit.
* **precipitationUnit(unit)** - Sets the unit of precipitation and returns this chart. Default is inch.
* **data(data)** - Sets the yearly weather data and return this chart.
* **render()** - Renders the visualization and returns this chart.