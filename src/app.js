import {getChartData} from "./data";
import {chart} from "./chart";

const myChart = chart(document.getElementById('chart'), getChartData())

myChart.init()








