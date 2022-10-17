import {noop} from "./utils";

export class Filters {
    constructor(root, data) {
        this.data = data
        this.checkedData = Object.keys(data.names)
        console.log(this.checkedData, 'this.checkedData')
        this.root = root
        this.container = this.root.querySelector('[data-el="filters"]')
        this.initTemplates()
        this.setup()
        this.changeHandler = noop
    }

    get preparedData() {
        return Object.keys(this.data.names).map(item => {
            return {
                name: this.data.names[item],
                color: this.data.colors[item],
                id: item
            }
        })
    }

    initTemplates() {
        const template = this.preparedData.map(checkbox => {
            return `
            <div class="filters__item">
                    <label for="${checkbox.id}" style="color: ${checkbox.color}">${checkbox.name}</label>
                    <input type="checkbox" class="filters__checkbox" checked id="${checkbox.id}" data-el="checkbox">
                    <label for="${checkbox.id}"  class="filters__checkbox-fake" style="color: ${checkbox.color}"></label>
             </div>
            `
        }).join('')
        this.container.insertAdjacentHTML('afterbegin',template)
    }

    setup() {
        this.container.addEventListener('change', this.onChange.bind(this))
    }

    onChange(e) {
        if (e.target.dataset.el === 'checkbox') {
            if (e.target.checked) {
                this.checkedData.push(e.target.id)
            } else {
                this.checkedData = this.checkedData.filter(item => item !== e.target.id)
            }
            this.changeHandler(this.checkedData)
        }
    }

    subscribe(fn) {
        this.changeHandler = fn
        fn(this.checkedData)
    }

}