import './styles.scss'
import {circle, computeBoundaries, computeXRatio, computeYRatio, css, isOver, line, toCoords, toDate} from "./utils";
import {tooltip} from "./tooltip";
import {sliderChart} from "./slider";

const WIDTH = 600
const HEIGHT = 200
const DPI_WIDTH = WIDTH * 2
const DPI_HEIGHT = HEIGHT * 2
const PADDING = 40
const VIEW_HEIGHT = DPI_HEIGHT - PADDING*2
const VIEW_WIDTH = DPI_WIDTH
const ROWS_COUNT = 5
const SPEED = 1500


export function chart(root, data) {
    const canvas = root.querySelector('[data-el="main"]')
    const ctx = canvas.getContext('2d')
    const tip = tooltip(root.querySelector('[data-el="tooltip"]'))
    const slider = sliderChart(root.querySelector('[data-el="slider"]'), data, DPI_WIDTH)
    let raf;
    let prevMax;
    canvas.width = DPI_WIDTH
    canvas.height = DPI_HEIGHT
    css(canvas, {
        width: WIDTH + 'px',
        height: HEIGHT + 'px'
    })

    canvas.addEventListener('mousemove', mousemove)
    canvas.addEventListener('mouseleave', mouseleave)

    const proxy = new Proxy({}, {
        set(...args) {
            const result = Reflect.set(...args)
            raf = requestAnimationFrame(paint)
            return result
        }
    })

    slider.subscribe(pos => {
        proxy.pos = pos
    })

    function mousemove({clientX, clientY}) {
        const { left, top } = canvas.getBoundingClientRect()
        proxy.mouse = {
            x: (clientX - left) * 2,
            tooltip: {
                left: clientX - left,
                top: clientY - top
            }
        }
    }

    function mouseleave() {
        proxy.mouse = null
        tip.hide()
    }

    function clear() {
        ctx.clearRect(0, 0, DPI_WIDTH, DPI_HEIGHT)
    }

    function getMax(yMax) {
        const step = (yMax - prevMax) / SPEED

        if (proxy.max < yMax) {
            proxy.max +=step
        } else if (proxy.max > yMax) {
            proxy.max = yMax
            prevMax = yMax
        }

        return proxy.max
    }

    function translateX(length, xRatio, left) {
        return -1 * Math.round((left * length * xRatio) / 100)
    }

    function paint() {
        clear()
        const length = data.columns[0].length
        const leftIndex = Math.round((length * proxy.pos[0]) / 100)
        const rightIndex = Math.round((length * proxy.pos[1]) / 100)

        const columns = data.columns.map(col => {
            const res = col.slice(leftIndex, rightIndex)
            if (typeof res[0] !== 'string') {
                res.unshift(col[0])
            }
            return res
        })


        const [yMin, yMax] = computeBoundaries({columns, types: data.types})


        if(!prevMax)  {
            prevMax = yMax
            proxy.max = yMax
        }

        const max = getMax(yMax)
        const yRatio = computeYRatio(VIEW_HEIGHT, max, yMin)
        const xRatio = computeXRatio(VIEW_WIDTH, columns[0].length)

        const translate = translateX(data.columns[0].length, xRatio, proxy.pos[0])
        const yData = data.columns.filter(col => data.types[col[0]] === 'line');
        const xData = data.columns.filter(col => data.types[col[0]] !== 'line')[0]


        yAxis(yMin, max)
        xAxis(xData, xRatio, yData)

        yData.map(toCoords(xRatio, yRatio, DPI_HEIGHT, PADDING, yMin)).forEach((coords, idx) => {
            const color = data.colors[yData[idx][0]]
            line(ctx, coords, {color, translate})
            for (const [x, y] of coords) {
                if (isOver(proxy.mouse, x, coords.length, DPI_WIDTH)) {
                    circle(ctx, [x, y], color)
                    break
                }
            }
        })
    }

    function xAxis( xData, xRatio, yData) {
        const colsCount = 6
        const step = Math.round(xData.length / colsCount)
        ctx.beginPath()
        for (let i = 1; i< xData.length; i++) {

            const x = i * xRatio
            if ((i - 1) % step === 0) {
                ctx.fillText(toDate(xData[i]), x, DPI_HEIGHT - 10)
            }
            if (isOver(proxy.mouse, x, xData.length, DPI_WIDTH)) {
                ctx.save()
                ctx.moveTo(x, PADDING / 2)
                ctx.lineTo(x, DPI_HEIGHT - PADDING)
                ctx.stroke()
                ctx.restore()
                tip.show(proxy.mouse.tooltip, {
                    title: toDate(xData[i]),
                    items: yData.map(col => ({
                        color: data.colors[col[0]],
                        name: data.names[col[0]],
                        value: col[i + 1]
                    }))
                })
            }
        }
        ctx.closePath()
    }

    function yAxis(yMin, yMax) {
        const step = VIEW_HEIGHT / ROWS_COUNT
        const textStep = (yMax - yMin) / ROWS_COUNT
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.strokeStyle = '#bbb'
        ctx.font = 'normal 20px Helvetica, sans-serif'
        ctx.fillStyle = '#96a2aa'
        for (let i = 1; i<= ROWS_COUNT; i++) {
            const y = step*i
            const text = Math.round(yMax - textStep*i)
            ctx.fillText(`${text}`, 5, y + PADDING - 10)
            ctx.moveTo(0, y + PADDING)
            ctx.lineTo(DPI_WIDTH, y + PADDING)
            ctx.stroke()
        }
        ctx.closePath()
    }

    return {
        init() {
            paint()
        },
        destroy() {
            canvas.removeEventListener('mousemove', mousemove)
            canvas.removeEventListener('mouseleave', mouseleave)
            cancelAnimationFrame(raf)
        }
    }
}

