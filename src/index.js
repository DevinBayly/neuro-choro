class Application {
  // starts off with the add pane button
  // holds all panes?
  constructor() {
    // create the button
    this.panes = []
  }
  // changed?
  async addButton() {
    // fetch the region boundary data
    await fetch("src/GeoJson_HCP-MMP1/total_small_parsed.json").then(res => res.json()).then(j => {
      // assign result to the pane Parent
      // this almost needs to be tied to the application instead
      this.regionBoundaryData = j
    })
    this.btndiv = document.createElement("div")
    this.btndiv.id = "btnholder"
    this.btn = document.createElement("button")
    this.btn.onclick = this.addPane.bind(this)
    this.btn.setAttribute("id", "addbtn")
    this.btn.innerHTML = "Add Pane"
    this.btndiv.append(this.btn)
    document.body.append(this.btndiv)
    // create the export button also 
    this.exportBtn = document.createElement("button")
    this.exportBtn.innerHTML = "Export"
    this.exportBtn.addEventListener("click", this.export.bind(this))
    document.body.append(this.exportBtn)
    // create the import button
    this.importBtn = document.createElement("button")
    this.importBtn.innerHTML = "Import"
    this.importBtn.addEventListener("click", this.import.bind(this))
    document.body.append(this.importBtn)
  }
  async import() {
    fetch("./test.json").then(res => res.json()).then(async e => {
      // iterate over the panes
      for (let pane of e.panes) {
        console.log(pane)
        await this.addPane()
        // select correct options
        let activePane = this.panes[this.panes.length - 1]
        // set the fillCol to the previous 
        let fillSelector = activePane.paneDiv.querySelector("#fillCol")
        fillSelector.value = pane.fillColValue
        // emit change event to trigger drawing
        fillSelector.dispatchEvent(new Event("change"))

        // set the view correctly,
        activePane.brainView = pane.brainView
        let radio = activePane.paneDiv.querySelector(`#radio${pane.brainView}`)
        radio.checked = true
        // set the slice of the view 
        let slider = activePane.paneDiv.querySelector("#rangeslider")
        slider.value = pane.sliderIndex
        // dispatch the event that draws the canvas for the slider change
        slider.dispatchEvent(new Event("input"))
        // add info to the fillFilter boxes
        // but not all sessions will use it so check first
        if (pane.valFilterMax) {
          activePane.updateFillFilter(pane.valFilterMin, pane.valFilterMax)
        }
        if (pane.altFiltersState) {
          // iterate over the altfilters used
          let btn = document.querySelector("#altfilterbutton")
          for (let key in pane.altFiltersState) {
            let filterSettings = pane.altFiltersState[key]
            // click to generate a filter row
            btn.click()
            // query to find colVal selector
            // take the last which will be the most recent addition
            let row = Array(...document.querySelectorAll(".altFilterRow")).pop()
            let rowSelect = row.querySelector("#colname")
            // assign value to the selector from import
            // NOTE requires the correct csv to be loaded already too
            rowSelect.value = filterSettings.colname
            rowSelect.dispatchEvent(new Event("change"))
            // select the correct operations values too
            let op = row.querySelector("#op")
            op.value = filterSettings.op
            let val = row.querySelector("#val")
            val.value = filterSettings.val
            // emit a changed to trigger masking
            val.dispatchEvent(new Event("change"))
          }
        }
        // import the tooltips that were active on the pane last session 
        if (pane.rois) {
          for (let roi in pane.rois) {
            activePane.rois[roi] = pane.rois[roi]
          }
        }
        if (pane.ta) {
          activePane.ta.value = pane.ta
        }
      }
    })
  }
  export() {
    // create the export ob
    let expOb = { panes: [] }
    // iterate over the panes
    for (let pane of this.panes) {
      // collect the relevant information
      // omit the boundary file
      let { regionBoundaryData, ...rest } = pane
      rest.ta = pane.ta.value
      expOb.panes.push(rest)
    }
    let a = document.createElement("a")
    a.download = "test.json"     // create a fake a tag with the download property linked to a blob containing the kson, and then click it
    a.href = URL.createObjectURL(new Blob([JSON.stringify(expOb)]))
    a.click()


  }
  async addPane() {
    let newPane = new Pane(this.panes.length)
    // pass reference to pane, to be used by ctrlOp and Canvas
    newPane.regionBoundaryData = this.regionBoundaryData
    // here's the point where we can connect up the various parts
    // finish pane loading

    // create ctrloptions
    this.ctrlop = new CtrlOp(newPane.paneDiv, newPane)
    // loads the data and such
    await this.ctrlop.init()

    // create the canvas
    this.can = new Canvas(newPane.paneDiv, newPane, 500, 20)
    this.can.init()
    // target the canvas with our events
    this.ctrlop.target(this.can.can)

    this.panes.push(newPane)
  }
}

class Pane {
  // initiates construction of the ctrl op object for the pane all the buttons and stuff that have control over the canvas
  // initiates creation of the canvas
  constructor(count) {
    // generate the pane div
    // want radio w 3 buttons, range slider, selection form for loading
    let paneDiv = document.createElement("div")
    paneDiv.className = "pane"
    paneDiv.setAttribute("id", "pane" + count)
    this.paneDiv = paneDiv
    document.body.append(this.paneDiv)
    // create the ctrlop and canvas
  }
}

class CtrlOp {
  // file loading, val columns, filters, view radio buttons, and slice sliders
  // meaningful aspects of ctrlOp state
  //  sliderIndex, sliceName brainView, sliceData, (brain region data)
  //  initialColData, filteredColData,colName, csvData (region fill data)

  constructor(paneDiv, paneOb) {
    this.paneOb = paneOb
    let ctrlDiv = document.createElement("div")
    ctrlDiv.className = "ctrlDiv"
    // add a section to the ctrldiv that clicking and dragging will actually move the entire paneholder
    paneDiv.append(ctrlDiv)
    this.paneDiv = paneDiv
    this.ctrlDiv = ctrlDiv
    this.eTarget = undefined
  }
  target(ele) {
    this.eTarget = ele
  }
  // these functions will get called in the event listeners and allow the canvas to have the correct data 
  // this is called in the button click scope, where I believe we are permitted to perform an await before making the canvas
  async init() {
    // setup the radio buttons
    this.mkradio("axial")
    this.mkradio("sagittal")
    this.mkradio("coronal")
    // selected is the radio button we have selected
    this.paneOb.brainView = "sagittal" // default
    this.paneOb.paneDiv.querySelector("#radiosagittal").checked = true

    // instantiate loader
    await this.loader()

    // create the, column selectors, sliders, and the filters
    this.createSelector()

    // create the brain slice slider
    this.createSlider()

    // create the activity and category filters


  }
  // in preparation for iodide version no more fetching in this way is necessary, just look for data at a specific spot on local host and then we will change it later on
  async loader() {
    // make the form that uploads the data
    await fetch("./src/HCP_modified.csv").then(
      res => {
        return res.text()
      }
    ).then(text => {
      this.csvDataReader(text)
    })
  }
  csvDataReader(csvRawString) {
    // !! think carefully about the types of errors that might come up here
    // turn this into a json that has the names of the columns as fields, and each has an array which is the data that follows
    // NOTE each row must either end with a \r or a \n
    let lines = csvRawString.replace(/\r|\n/g, "---").split("---")
    let headers = lines[0].split(",")
    this.paneOb.csvData = {}
    headers.map(e => {
      this.paneOb.csvData[e.toLowerCase()] = []
    })
    // read through the rest of the lines and add them to the data
    // although if this were running off a server, we could convert it right then, but then we have hippa concerns? ask dianne
    for (let iLine = 1; iLine < lines.length; iLine++) {
      let entries = lines[iLine].split(",")
      for (let i = 0; i < entries.length; i++) {
        this.paneOb.csvData[headers[i].toLowerCase()].push(entries[i])
      }
    }
  }
  mkradio(view) {
    let rad = document.createElement("input")
    rad.type = "radio"
    rad.id = "radio" + view
    rad.name = "view"
    rad.value = view
    let label = document.createElement("label")
    label.setAttribute("for", rad.id)
    label.innerHTML = view
    let div = document.createElement("div")
    div.className = "radcontainer"
    div.id = "radcontainer" + view
    div.append(rad)
    div.append(label)
    this.ctrlDiv.append(div)
    // add this.paneOb.brainView on change
    rad.addEventListener("click", () => {
      this.paneOb.brainView = rad.value
      // also update the max for the slider
      this.slider.max = this.sliderSlices[this.paneOb.brainView].length - 1
      let e = new Event("radiobuttonchanged")
      if (this.eTarget) {
        let slice = this.paneOb.regionBoundaryData[this.sliderSlices[this.paneOb.brainView][this.paneOb.sliderIndex]]
        this.paneOb.sliceData = slice
        this.eTarget.dispatchEvent(e)
      }
    })
  }
  // this is the part for creating the column selection area
  // deals with the csv data
  createSelector() {

    // this is the selection element that is populated by the column names in the csv

    let valueColumnSelect = document.createElement("select")
    valueColumnSelect.id = "fillCol"
    for (let key of Object.keys(this.paneOb.csvData)) {
      let option = document.createElement("option")
      option.value = key
      option.innerHTML = key
      valueColumnSelect.append(option)
    }
    this.ctrlDiv.append(valueColumnSelect)
    valueColumnSelect.onchange = () => {
      // make access to the selector possible
      this.paneOb.fillColValue = valueColumnSelect.value
      // parse the data into numeric
      let numericData = this.paneOb.csvData[valueColumnSelect.value].map(e => parseFloat(e))
      this.paneOb.initialColData = numericData

      // establish filters for the selected column of data
      this.createFilters()

      // trigger a valcolchange event
      // this will make the filters update themselves, and make the canvas redraw the 
      let e = new Event("valcolchange")
      // update the canvas columdata somehow
      if (this.eTarget) {
        // send it to the canvas
        this.eTarget.dispatchEvent(e)
      }
    }
  }
  prepRangeData() {
    let slicesByView = {
      "sagittal": [],
      "axial": [],
      "coronal": []
    }
    for (let n in this.paneOb.regionBoundaryData) {
      if (n.search(/cor/) == 0) {
        slicesByView["coronal"].push(n)
      }
      if (n.search(/sag/) == 0) {
        slicesByView["sagittal"].push(n)
      }
      if (n.search(/ax/) == 0) {
        slicesByView["axial"].push(n)
      }
    }
    let sortfunc = (x, y) => {
      let xmm = parseInt(x.match(/(-?\d+\.?\d*?)(mm)?/)[1])
      let ymm = parseInt(y.match(/(-?\d+\.?\d*?)(mm)?/)[1])
      return xmm - ymm
    }
    slicesByView.axial.sort(sortfunc)
    slicesByView.sagittal.sort(sortfunc)
    slicesByView.coronal.sort(sortfunc)
    this.sliderSlices = slicesByView
    // get the array of values
    this.sliderMeasurements = {}
    this.sliderMeasurements.axial = slicesByView.axial.map(sl => {
      return (sl.match(/(-?\d+\.?\d*?mm)/)[1])
    })
    this.sliderMeasurements.sagittal = slicesByView.sagittal.map(sl => {
      return (sl.match(/(-?\d+\.?\d*?mm)/)[1])
    })
    this.sliderMeasurements.coronal = slicesByView.coronal.map(sl => {
      return (sl.match(/(-?\d+\.?\d*?mm)/)[1])
    })
  }
  // deals with the boundary data 
  createSlider() {
    //initiate the slider
    let range = document.createElement("input")
    range.id = "rangeslider"
    let label = document.createElement("label")
    label.id = "rangesliderlabel"
    range.name = "slicerange"
    range.type = "range"
    label.setAttribute("for", "slicerange")
    this.ctrlDiv.append(range)
    this.ctrlDiv.append(label)
    this.slider = range
    this.sliderlabel = label
    // makes several attributes helpful for handling slider change
    this.prepRangeData()
    // add the on input event emitter  for when slider moves
    // 
    this.slider.oninput = () => {
      this.selectedSliceIndex = parseInt(this.slider.value)
      // now determine which slice we are supposed to draw the boundaries of provided the selected brain view an the slice index
      let ind = parseInt(range.value)
      this.paneOb.sliderIndex = ind
      // having trouble getting the
      let name = this.sliderSlices[this.paneOb.brainView][ind]
      this.paneOb.sliceName = name
      this.sliderlabel.innerHTML = this.sliderMeasurements[this.paneOb.brainView][ind]
      this.paneOb.sliceMeasure = this.sliderlabel.innerHTML
      // provide the name of the slice to the canvas drawing machinery
      // ....
      let e = new Event("sliderchange")
      if (this.eTarget) {
        let slice = this.paneOb.regionBoundaryData[this.sliderSlices[this.paneOb.brainView][this.paneOb.sliderIndex]]
        this.paneOb.sliceData = slice
        this.eTarget.dispatchEvent(e)
      }
    }
  }
  // prepare the filters
  createFilters() {
    if (this.activityFilter) {
      this.activityFilter.remove()
    }
    this.activityFilter = new FillColFilter(this.ctrlDiv, this.paneOb.initialColData, this.eTarget, this.paneOb)
    this.activityFilter.init()
    // set them at default values
    // categorical filters
    if (this.categoricalFilter) {
      this.categoricalFilter.remove()
    }
    this.categoricalFilter = new AltHolder(this.ctrlDiv, this.paneOb)
    this.categoricalFilter.init()


  }
}

class AltColumnFilters {
  // 
  constructor(outerHolder, paneOb) {
    this.outerHolder = outerHolder
    this.paneOb = paneOb
    this.holder = document.createElement("div")
    this.holder.className = "altFilterRow"
    this.expInfo = {}
    //

  }
  // process should look like, first have a selector for the column names of the csv
  // then on select, detect whether you should make numerical or categorical options make selections for the == and != , then the unique column
  init() {
    this.outerHolder.append(this.holder)
    this.removeBtn = document.createElement("button")
    this.removeBtn.innerHTML = "X"
    this.removeBtn.addEventListener("click", this.removeSelf.bind(this))
    this.holder.append(this.removeBtn)
    // make the first select element of the csv columns
    this.columnSelector()
    // add x button that removes the whole element, double check 
    // delete


  }
  makeSelectUnique() {
    this.catSelect = document.createElement("select")
    this.catSelect.id = "val"
    for (let op of uniqueSet) {
      let option = document.createElement("option")
      this.catSelect.append(option)
      option.value = op
      option.innerHTML = op
    }
  }
  columnSelector() {
    this.altColSelect = document.createElement("select")
    // the column names of the csv
    this.altColSelect.id = "colname"
    for (let colOption in this.paneOb.csvData) {
      //
      let option = document.createElement("option")
      this.altColSelect.append(option)
      option.value = colOption
      option.innerHTML = colOption
    }
    this.holder.append(this.altColSelect)
    // on change, replace the other elements with new operation and selector
    this.altColSelect.onchange = this.generateOperations.bind(this)

  }
  generateOperations() {
    // check whether the column is numeric
    this.expInfo["name"] = this.altColSelect.value
    this.paneOb.altFiltersState[this.id].colname = this.altColSelect.value
    if (parseFloat(this.paneOb.csvData[this.altColSelect.value][0])) {
      // the value was numeric, t
      this.operation = document.createElement("select")
      this.operation.id = "op"
      let equals = document.createElement("option")
      equals.innerHTML = "<"
      equals.value = "<"
      let notEquals = document.createElement("option")
      notEquals.innerHTML = ">"
      notEquals.value = ">"
      this.operation.append(equals)
      this.operation.append(notEquals)
      this.holder.append(this.operation)
      // create an input point for value input
      this.valueSelector = document.createElement("input")
      this.valueSelector.type = "text"
      this.holder.append(this.valueSelector)
      this.operation.onchange = this.mask.bind(this)
      this.valueSelector.onchange = this.mask.bind(this)

    } else {
      // remove existing elements too
      // generate the == != select
      this.operation = document.createElement("select")
      this.operation.id = "op"
      let equals = document.createElement("option")
      equals.innerHTML = "=="
      equals.value = "=="
      let notEquals = document.createElement("option")
      notEquals.innerHTML = "!="
      notEquals.value = "!="
      this.operation.append(equals)
      this.operation.append(notEquals)
      this.holder.append(this.operation)

      // make a populated selector with unique options from the column
      this.findUniqueElements()
      this.valueSelector = document.createElement("select")
      this.valueSelector.id = "val"
      for (let op of this.uniqueSet) {
        //make an option with each
        let opele = document.createElement("option")
        opele.value = op
        opele.innerHTML = op
        this.valueSelector.append(opele)
      }
      this.holder.append(this.valueSelector)
      // do mask on both the selectors change
      this.operation.onchange = this.mask.bind(this)
      this.valueSelector.onchange = this.mask.bind(this)
      // mask using  defaults
      this.mask()
    }
  }
  // generate a 0 1 vector to determine whether the filter should keep or toss a fillColumn value
  mask() {
    this.expInfo["operation"] = this.operation.value
    this.expInfo["value"] = this.valueSelector.value
    this.paneOb.altFiltersState[this.id].op = this.operation.value
    this.paneOb.altFiltersState[this.id].val = this.valueSelector.value
    this.boolMask = this.paneOb.csvData[this.altColSelect.value].map(e => {
      if (this.operation.value == "==") {
        if (e == this.valueSelector.value) {
          return 1
        }
        return 0
      }
      if (this.operation.value == "!=") {
        if (e != this.valueSelector.value) {
          return 1
        }
        return 0
      }
      if (this.operation.value == ">") {
        if (e > parseFloat(this.valueSelector.value)) {
          return 1
        }
        return 0
      }
      if (this.operation.value == "<") {
        if (e < parseFloat(this.valueSelector.value)) {
          return 1
        }
        return 0
      }
    })
    // emit event on the holder that the altchanged
    let altchange = new Event("altchange")
    this.outerHolder.dispatchEvent(altchange)

  }
  findUniqueElements() {
    this.uniqueSet = []
    for (let element of this.paneOb.csvData[this.altColSelect.value]) {
      if (this.uniqueSet.indexOf(element) == -1) {
        this.uniqueSet.push(element)
      }
    }
  }
  // make it possible to take the filter out
  removeSelf() {
    // triggered by clicking the exit button
    this.holder.remove()
    // take self out of the filter list on the AltHolder ob
    this.removeFromList(this)
  }
}

// create a alt column filter row holder, have each of the change elements emit an event that iterates over the bool masks, and creates a sintgle altfiltered column data set, could even hook up the result of the filter to emit event thtat triggers canvas setup() draw()

//  there will be one filter categorical for each pane, and within it there will be options to create a 
//

class AltHolder {
  constructor(ctrlDiv, paneOb) {
    // button and larger div for the elements to get added in
    this.ctrlDiv = ctrlDiv
    this.paneOb = paneOb
    this.createAltRowBtn = document.createElement("button")
    this.createAltRowBtn.innerHTML = "Create Alt Column Filter"
    this.createAltRowBtn.id = "altfilterbutton"
    this.altfilters = []
  }
  init() {
    this.holder = document.createElement("div")
    this.holder.id = "altcolholder"
    this.createAltRowBtn.onclick = this.addRow.bind(this)
    this.holder.append(this.createAltRowBtn)
    this.ctrlDiv.append(this.holder)
    this.idCount = 0
    // attach the altfilters to the paneOb for export
    this.paneOb.altFiltersState = {}

  }
  addRow() {
    let newAlt = new AltColumnFilters(this.holder, this.paneOb)
    newAlt.init()
    newAlt.id = this.idCount
    this.idCount++
    // add to the pane collection for export as well
    this.paneOb.altFiltersState[newAlt.id] = { colname: "", op: "", val: "" }
    // add the removal function to take it from the list too

    newAlt.removeFromList = this.removeFromList.bind(this)

    this.altfilters.push(newAlt)
    this.holder.addEventListener("altchange", this.filter.bind(this))


  }
  filter() {
    //iterate over the altfilters, and then only let through the ones that work with each bool mask
    // reduce on the intiial paneob data iterate over all the individual boolmask values
    this.paneOb.filteredAltColData = this.paneOb.initialColData.map((e, i) => {
      let isNa = false
      for (let altfilter of this.altfilters) {
        if (altfilter.boolMask[i] == 0) {
          isNa = true
          break
        }
      }
      if (isNa) {
        return NaN
      } else {
        return e
      }
    })
    let e = new Event("filterChange")
    // get the canvas element
    this.paneOb.paneDiv.querySelector("canvas").dispatchEvent(e)

    // extract filter name information to use in the tooltip
    this.paneOb.altFilterInfo = ""
    for (let altfilter of this.altfilters) {
      //
      this.paneOb.altFilterInfo += JSON.stringify(altfilter.expInfo)
    }
  }
  removeFromList(ele) {
    // go through the list and find the one that has the same values for the filtering elements
    // columnselector && operation && valueSelector
    let index = 0
    for (let filter of this.altfilters) {
      if (ele.id == filter.id) {
        // remove it from the list 
        this.altfilters.splice(index, 1)
        // also remove the entry from the paneob export object
        delete this.paneOb.altFiltersState[index]
        // trigger remask calculation so as not to confuse whats active
        this.filter()

      }
      index += 1
    }


  }
  remove(){
    this.holder.remove()
    this.createAltRowBtn.remove()
  }

}

class FillColFilter {
  constructor(ctrlDiv, data, eventTarget, paneOb) {
    this.min = undefined
    this.max = undefined
    this.ctrlDiv = ctrlDiv
    this.data = data
    this.eTarget = eventTarget
    this.paneOb = paneOb
  }
  //remove the previous filter elements
  remove() {
    this.minlabel.remove()
    this.maxlabel.remove()
    this.maxel.element.remove()
    this.minel.element.remove()
  }
  init() {
    // make a range slider that updates the self filter function which is called later on activity data
    let rangeWidth = this.ctrlDiv.getBoundingClientRect()
    let min = new divMaker(rangeWidth.width / 4, this.ctrlDiv)
    let max = new divMaker(rangeWidth.width / 4, this.ctrlDiv)

    // establish the absmin and absmax of the column data
    // raise hell if the data can't be sorted this way
    this.setbounds(Math.min(...this.data), Math.max(...this.data))

    this.maxel = max
    this.minel = min
    // make the draggable elements catch movement events and ensure that the filter method gets called when dragging stops
    this.maxel.element.addEventListener("divmoved", this.filter.bind(this))
    this.minel.element.addEventListener("divmoved", this.filter.bind(this))
    // this si the amount of screen space that the filter div's can move, minus the width of the element
    this.width = (rangeWidth.width / 4) - 30
    // create labels
    this.minlabel = document.createElement("p")
    this.minlabel.id = "minlabel"
    this.minlabel.className = "filterLabel"
    this.maxlabel = document.createElement("p")
    this.minlabel.id = "maxlabel"
    this.maxlabel.className = "filterLabel"
    let labelholder = document.createElement("div")
    labelholder.id = "labelholder"
    // prevent sliders from going over each other
    min.additionalLimit = (v) => {
      // stay below the max point
      let maxleft = parseInt(max.element.style.left)
      if (v > maxleft) {
        min.element.style.left = `${maxleft}px`
        this.min = maxleft
        // update min label
        this.minlabel.innerHTML = (maxleft * this.absmax / (this.width)).toFixed(5)
        return true
      }
      this.min = v
      // update min label and account for the divslider width
      this.minlabel.innerHTML = (v * this.absmax / (this.width)).toFixed(5)
      return false
    }
    max.additionalLimit = (v) => {
      let minleft = parseInt(min.element.style.left)
      if (v < minleft) {
        max.element.style.left = `${minleft}px`
        this.max = minleft
        this.maxlabel.innerHTML = (minleft * this.absmax / (this.width)).toFixed(5)
        return true
      }
      this.maxlabel.innerHTML = (v * this.absmax / (this.width)).toFixed(5)
      this.max = v
      return false
    }
    labelholder.append(this.minlabel, this.maxlabel)
    this.ctrlDiv.append(min.element)
    this.ctrlDiv.append(max.element)
    this.ctrlDiv.append(labelholder)
    // once placed, set this to keep in correct spot, make them sit on same line
    max.element.style.top = `-30px` // overlap the element with the other
    max.element.style.left = "50px"

    // provide a way to initialize values via styling from import
    this.paneOb.updateFillFilter = (importMin, importMax) => {
      // move the divs
      min.element.style.left = importMin + "px"
      max.element.style.left = importMax + "px"
      // populate the instance variables, and labels
      min.additionalLimit(importMin)
      max.additionalLimit(importMax)
    }
  }
  filter() {
    // calculate the actual min activity value
    let activitymin = this.absmax * this.min / this.width
    let activitymax = this.absmax * this.max / this.width
    // give this information to the paneOb,useful for tooltips
    this.paneOb.valFilterMin = activitymin
    this.paneOb.valFilterMax = activitymax
    this.paneOb.filteredFillColData = this.data.map(e => {
      if (e >= activitymin && e <= activitymax) {
        return e
      }
      return NaN
    })
    // emit an actual canvas filtered event 
    let e = new Event("filterChange")
    this.eTarget.dispatchEvent(e)

  }
  addData(data) {
    this.data = data
  }
  setbounds(absmin, absmax) {
    this.absmax = absmax
    this.absmin = absmin
  }
}


class divMaker {
  constructor(width, holder) {
    let d = document.createElement("div")
    this.element = d
    d.style.height = "30px"
    d.style.width = "30px"
    d.style.position = "relative"
    let move = (e) => {
      let x = e.clientX - holder.getBoundingClientRect().left
      let left = x
      if (left > width - 30) { // because the size of the div at the moment is 30
        left = width - 30
      }
      if (left < 0) {
        left = 0
      }
      if (this.additionalLimit(left)) {
        console.log("stopped marker")
      } else {
        this.element.style.left = `${left}px`
      }
      this.v = parseInt(this.element.style.left)
    }
    let cancelMove = (e) => {
      console.log("cancelling")
      document.removeEventListener("mousemove", move)
      document.removeEventListener("mouseup", cancelMove)
      // emit event that canvas must redraw
      // right now there is no etarget because this is a makediv not a ctrlop
      let divEvent = new Event("divmoved")
      // dispatch it with the d, and listen on the min and max to emit filter calls
      d.dispatchEvent(divEvent)
    }
    let click = () => {
      document.addEventListener("mousemove", move)
      document.addEventListener("mouseup", cancelMove)
    }
    d.addEventListener("mousedown", click)
    d.style.background = "#00000052"
  }
  // this function is replaced in the instances of the object, class inheritance case
  additionalLimit(v) {
    return undefined
  }
}


class Canvas {
  // holds stuff like the global min/max, the invisible and visible canvases, the boundary lines, and various interpolators
  // use the ctrlInstance to get things like boundary data, and fill data when the values change
  // use paneOb when there are needs for boundary data or filteredColData
  constructor(paneDiv, paneOb, size, margin) {
    this.margin = margin
    this.size = size
    this.can = document.createElement("canvas")
    // the invisible canvas is used to assist with the mapping of clicks to uniquely colored regions whose pixels can be queried for color strings mapping to region names
    // easy hack to keep performance and accuracy of interactivity on canvas
    this.invisican = document.createElement("canvas")
    this.invisican.id = "invisican"
    // makes resizes not affect xy of canvas
    this.canvasHolder = document.createElement("div")
    this.canvasHolder.id = "canvasHolder"
    this.infoHolder = document.createElement("div")
    this.infoHolder.className = "infoHolder"
    // other versions of teh data will be around later,
    // get data for boundaries and selected value column
    this.paneDiv = paneDiv
    this.paneOb = paneOb
    this.paneOb.rois = {}
    // setup the text area for note taking
    this.paneOb.ta = document.createElement("textarea")
    //thi
  }
  // capture the this value, and let teh callback modify the canvas property coldata
  makeRegDataMap() {
    this.regNameToValueMap = {}
    // drawregions without fill if nothing selected yet
    if (this.fillData == undefined) {
      this.paneOb.csvData["region"].map((e, i) => {
        this.regNameToValueMap[e.replace(/\s/, "")] = NaN
      })
    } else {
      this.paneOb.csvData["region"].map((e, i) => {
        this.regNameToValueMap[e.replace(/\s/, "")] = this.fillData[i]
      })
    }
  }
  init() {
    // setup the canvas
    this.canvasHolder.append(this.can)
    this.canvasHolder.append(this.paneOb.ta)
    this.canvasHolder.append(this.infoHolder)
    this.paneDiv.append(this.canvasHolder)
    this.can.height = this.size
    this.can.width = this.size
    this.invisican.height = this.size
    this.invisican.width = this.size
    //create interpolators for drawing
    //map xmin - xmax to 0 to 5000 or whatever width is do the same for y
    // create the regnametoValueMap
    this.ctx = this.can.getContext("2d")
    this.invisictx = this.invisican.getContext("2d")
    // take care of binding various functions to the events that get emitted
    // events to track valcolchange,radiobuttonchanged,sliderchange, filterChange
    // valcolchange we need to wait until something happens with the sliders?

    this.can.addEventListener("click", this.getPos.bind(this))
    //radiobutton and slider change have implications for the slice we are looking at
    this.can.addEventListener("radiobuttonchanged", () => {
      this.setupCanvas()
      this.drawCanvas()
    })
    this.can.addEventListener("sliderchange", () => {
      this.setupCanvas()
      this.drawCanvas()
    })

    //activity filter change, and valcolchange mean we must update our version of the ctrlInstance coldat, requires updating the regNameToValMap also
    this.can.addEventListener("filterChange", () => {
      this.setupCanvas()
      this.drawCanvas()
    })

  }
  // this is meant to query the ctrlInstance for what view and slice index we are on
  setupCanvas() {
    // mingle the two filtered datasets 
    this.fillData = []
    // if both data filters aren't specified use whole initial range
    if (this.paneOb.filteredFillColData == undefined &&
      this.paneOb.filteredAltColData == undefined) {
      this.fillData = this.paneOb.initialColData
    } else if (this.paneOb.filteredFillColData == undefined && this.paneOb.filteredAltColData != undefined) {
      this.fillData = this.paneOb.filteredAltColData
    } else if (this.paneOb.filteredFillColData != undefined && this.paneOb.filteredAltColData == undefined) {
      this.fillData = this.paneOb.filteredFillColData
    } else {
      // if only the activity is specified
      // if both filters are around
      for (let i = 0; i < this.paneOb.initialColData.length; i++) {
        // if the two different filters have non NAN at that index add it to fill

        if (isNaN(this.paneOb.filteredAltColData[i]) || isNaN(this.paneOb.filteredFillColData[i])) {
          this.fillData.push(NaN)
        } else {
          this.fillData.push(this.paneOb.initialColData[i])

        }

      }
    }
    // will update the map used in the draw to determine the color of a region
    this.makeRegDataMap()
    // initialize the color setting for the invisican
    let cc = color_collection(this.paneOb.sliceData.features.length)
    this.colToRegMap = {}
    this.regToColMap = {}
    this.paneOb.sliceData.features.map((f, i) => {
      // this is for the fill on the invisible canvas
      this.regToColMap[f.properties.regionName] = cc.array[i]
      this.colToRegMap[JSON.stringify(cc.array[i])] = f.properties.regionName
    })
    this.calcRegionSizeGlobal()
    // this will happen at the beginning before column selection
    if (this.fillData != undefined) {
      this.calcValueColMinMax()
    }
    // create the region data to screen space interpolators
    let xinterp = interpolator()
    let yinterp = interpolator()
    // use correct ratio
    if (this.canvasRatio > 1) {
      xinterp.setup(this.regionSizes[0], 0 + this.margin, this.regionSizes[2], this.can.width / this.canvasRatio - this.margin)
      yinterp.setup(this.regionSizes[1], (this.can.height - this.margin), this.regionSizes[3], this.margin)// extra 10is the margin split intwo

    } else {

      xinterp.setup(this.regionSizes[0], 0 + this.margin, this.regionSizes[2], this.can.width - this.margin)
      yinterp.setup(this.regionSizes[1], this.can.height * this.canvasRatio - this.margin, this.regionSizes[3], this.margin)// extra 10is the margin split intwo
    }
    this.yinterp = yinterp
    this.xinterp = xinterp
  }
  tooltipMaker(regionName, inner) {
    // make a little side box with the info in it
    // take away a chunk of the image at that area
    // remove any improper characters for the id
    let id = regionName.replace(/[-_]/g, "")
    let rightDiv = document.createElement("div")
    rightDiv.id = "tooltip" + id
    rightDiv.innerHTML = inner        //put new info in front of notes to canvas element if possible
    this.infoHolder.prepend(rightDiv)
    // add tooltip to the rois tooltip array
  }
  // add a tracker for regions clicked
  // populate elements on canvas like roi's which stores the region name, 
  // at draw time if region is in the roi list stroke it in purple, or green? ask josh what he thinks?
  // look at complementary colors for r b 
  // if they click in the same region again it should toggle it off and out of the listing
  getPos(e) {
    // the drawing holds both canvases, so we can get the x,y from the click, and apply it to the invisible can
    let rect = this.can.getBoundingClientRect()
    let x = e.clientX - rect.left
    let y = e.clientY - rect.top
    let ctx = this.invisictx
    // activate the border point-in-polygon algorithm
    // get image data
    // loop until we move right to get a pix value that is above certain threshold green
    let pix = Array(...ctx.getImageData(x, y, 1, 1).data.slice(0, 3))
    // query the invisible map
    if (this.colToRegMap[JSON.stringify(pix)] != undefined) {
      let regionName = this.colToRegMap[JSON.stringify(pix)]
      if (this.paneOb.rois[regionName] != undefined) {
        delete this.paneOb.rois[regionName]
      } else {
        this.paneOb.rois[regionName] = `
            <h3>Selected Region
              <p class="tooltip-child" id="regionname">
                    ${ regionName}
              </p>
              <p class="tooltip-child">
            <p>value: ${this.regNameToValueMap[regionName]}
            </p><p>view: ${this.paneOb.brainView}
            </p><p>fillColumnFilter: ${this.paneOb.valFilterMin} <= value <= ${this.paneOb.valFilterMax} 
            </p><p>slice: ${this.paneOb.sliceMeasure}

              </p><p>altfilterinfo:${this.paneOb.altFilterInfo}</p>
            </h3>
            `


      }
      // do a redraw
      this.drawCanvas()
    }
  }
  resize(height, width, margin) {
    this.can.height = height + margin
    this.can.width = width + margin
    this.invisican.height = height + margin
    this.invisican.width = width + margin
    this.ctx.lineWidth = lwidth
    this.invisictx.lineWidth = lwidth
  }
  // figure out how much actual space the brain region data takes up, this only needs to get figured out once per pane creation
  calcRegionSizeGlobal() {
    // scanCol is the column that has the data we care about putting in the color fill
    // this returns a summary object that knows things about the size of the brain json dimensions and also the min and max of hte scan data
    //!! should only do this part once
    let globals = [1000, 1000, -1000, -1000]
    for (let feature of this.paneOb.sliceData.features) {
      // likely nota  loop because coordinates is a single element array
      for (let line of feature.geometry.coordinates) {
        for (let pt of line) {
          if (pt[0] < globals[0]) {
            globals[0] = pt[0]
          }
          if (pt[1] < globals[1]) {
            globals[1] = pt[1]
          }
          if (pt[0] > globals[2]) {
            globals[2] = pt[0]
          }
          if (pt[1] > globals[3]) {
            globals[3] = pt[1]
          }
        }
      }
    }
    this.regionSizes = globals
    this.canvasRatio = globals[3] / globals[2]
  }
  // calculate the min and max of the column provided to the canvas class
  calcValueColMinMax() {
    this.scanDatamin = 0
    this.scanDatamax = 0
    for (let row of this.fillData) {
      if (row > this.scanDatamax) {
        this.scanDatamax = parseFloat(row)
      }
      if (row < this.scanDatamin) {
        this.scanDatamin = parseFloat(row)
      }
    }
    // this normalizes the value from the scan data into the range 0 to 1 for color interpolation
    let valToColInterp = interpolator()
    valToColInterp.setup(this.scanDatamin, 0, this.scanDatamax, 1)
    this.valToColInterp = valToColInterp
    // calculate the min and maxes of the scan data for each scan
  }

  drawCanvas() {
    //TODO find better version of how to structure so that the margin can be programmatically set
    this.ctx.clearRect(0, 0, this.can.width, this.can.height)
    this.invisictx.clearRect(0, 0, this.can.width, this.can.height)
    // remove previous tooltips
    while (this.infoHolder.firstChild) {
      this.infoHolder.removeChild(this.infoHolder.firstChild)
    }
    let red = {
      r: 255,
      g: 0,
      b: 0,
    }
    let gray = {
      r: 128,
      g: 128,
      b: 128
    }
    let blue = {
      r: 0,
      g: 0,
      b: 255
    }
    // iterate over the boundary data
    for (let region of this.paneOb.sliceData.features) {
      // this is the object that has features, and properties
      for (let coords of region.geometry.coordinates) {
        this.ctx.beginPath()
        this.invisictx.beginPath()
        // create simplified variable with points and region name
        let linedata = { points: coords, region: region.properties.regionName }

        // begin actual drawing to the canvas
        let first = linedata.points[0]
        let x = this.xinterp.calc(first[0])
        let y = this.yinterp.calc(first[1])
        this.ctx.moveTo(x, y)
        this.invisictx.moveTo(x, y)
        for (let i = 1; i < linedata.points.length; i++) {
          let pt = linedata.points[i]
          let x = this.xinterp.calc(pt[0])
          let y = this.yinterp.calc(pt[1])
          this.ctx.lineTo(x, y)
          this.invisictx.lineTo(x, y)
        }
        this.ctx.closePath()
        this.invisictx.closePath()
        // check if its a roilisted
        if (this.paneOb.rois[linedata.region]) {
          if (this.paneOb.rois[linedata.region]) {
            this.ctx.strokeStyle = "yellow"
            this.ctx.lineWidth = 5
            this.ctx.stroke()
          }
          // add tooltips that are visible
          let regId = linedata.region.replace(/[-_]/g, "")
          // if we don't find the element must make the tooltip
          if (!document.getElementById(`tooltip${regId}`)) {
            this.tooltipMaker(linedata.region, this.paneOb.rois[linedata.region])
          }
        }

        // these aren't defined yet
        if (this.regNameToValueMap != undefined) {
          if (this.regNameToValueMap[linedata.region]) {
            let scanData = this.regNameToValueMap[linedata.region]
            let t = this.valToColInterp.calc(scanData)
            let lerpc
            if (scanData < 0) {
              // use the blue to gray instead of gray to red
              lerpc = LerpCol(blue, gray, t, 2).calc()
            } else {
              lerpc = LerpCol(gray, red, t, 2).calc()
            }
            this.ctx.fillStyle = lerpc
            this.ctx.fill()
            // query the region to color map
          } else {
            // leave the section gray
            this.ctx.fillStyle = "gray";
            this.ctx.fill();
          }
        }
        this.invisictx.fillStyle = `rgb(${this.regToColMap[linedata.region][0]},${this.regToColMap[linedata.region][1]},${this.regToColMap[linedata.region][2]})`
        this.invisictx.fill()
      }
    }
  }
}

// non full blown classes
let color_collection = (rnum) => {
  ob = {}
  // this is the number of color chunks for each of the rgb channels
  let colordim = Math.ceil(Math.pow(rnum, 1 / 3))
  ob.array = []
  // nesting 3 deep, but each should be short
  for (let r = 0; r < colordim; r++) {
    for (let g = 0; g < colordim; g++) {
      for (let b = 0; b < colordim; b++) {
        let base = 255 / colordim // the base is permuted by each of the rgb loop variables
        // must round because the canvas sampling by pixel doesn't return floats
        ob.array.push([Math.round(base * r), Math.round(base * g), Math.round(base * b)])
      }
    }
  }
  return ob
}

let parametricInterp = () => {
  let ob = {}
  ob.setupRun = (x0, y0, x1, y1, step) => {
    let xys = []
    for (let t = 0; t < 1; t += step) {
      xys.push(ob.calct(x0, y0, x1, y1, t))
    }
    return xys
  }
  ob.calct = (x0, y0, x1, y1, t) => {
    return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]
  }
  return ob
}
let interpolator = () => {
  let ob = {}
  ob.setup = (x0, y0, x1, y1) => {
    ob.x0 = x0
    ob.y0 = y0
    ob.x1 = x1
    ob.y1 = y1
  }
  ob.calc = (x) => {
    return (ob.y1 - ob.y0) / (ob.x1 - ob.x0) * x + (ob.x1 * ob.y0 - ob.y1 * ob.x0) / (ob.x1 - ob.x0)
  }
  return ob
}

let LerpCol = (c1, c2, t, jitter) => {
  let red = Math.round(c1.r + (c2.r - c1.r) * t + Math.random() * jitter)
  if (red > 255) {
    red = 255
  }
  let blue = Math.round(c1.b + (c2.b - c1.b) * t + Math.random() * jitter)
  if (blue > 255) {
    blue = 255
  }
  let green = Math.round(c1.g + (c2.g - c1.g) * t + Math.random() * jitter)
  if (green > 255) {
    green = 255
  }
  return `rgb(${red},${green},${blue})`

}

window.onload = async () => {
  let app = new Application()
  await app.addButton()
}