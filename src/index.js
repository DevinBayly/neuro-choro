
%% md
# Neuro-choropleth 

This is a tool to efficiently perform initial analyses of neuroimaging multi subject scans. 
%% fetch
json: atlas = https://raw.githubusercontent.com/DevinBayly/neuro-choro/iodide/src/GeoJson_Brains/totalfix.json



%% md
<div id="applicationHolder"></div>
%% css


#minlabel {
  padding-right:20px;
}
#applicationHolder, div {
  max-width:none !important;
}
.infoholder{
  display:flex;
  flex-wrap:wrap;
}

div#btnholder {
  width:50%;
  text-align:center;
  padding:10%;
}
#btnholder button {
  width:30%;
  height:50px;
}
#backline {
  height: 10px;
  margin: 0px auto;
  background: rgba(80,80,80);
  width: 90%;
  position: relative;
  top: 65%;
}
#labelholder {

    height: 30px;
    margin: 0px 0px 10px 0px;
    width: 25%;
    display: flex;

}
#allpanes {
  display:flex;
  flex-wrap:wrap;
  justify-content:center;
}

div.fillFilterDiv {
    width: 25%;
    height:30px;
    margin: 0px 0px 10px 0px;
    
}
#sliderdiv::before {
  content:"Slice Selector";
  text-decoration:underline;
}

#radcontaineraxial::before {
  content:"brainviews: ";
  display:block;
  text-decoration:underline;
}
.altFilterRow img {
  width:20px;
  vertical-align:middle;
}
#fillcoldiv::before {
  content:"Region Color Column";
  text-decoration:underline;
}

div.pane {
    border: 1px 
    black solid;
    border-radius: 20px;
    padding: 10px;
    width:600px;
    margin:0 0;
}
#regionname {
    background:  #dbdbba;
}
.infoHolder {
  display:flex;
  flex-wrap:wrap;
}
.tooltipholder {
    width:50%;
    font-size: 12px;
    border: 1px black solid;
    border-radius: 20px;
    text-align: center;
}
%% js

class Application {
  /**
   *Creates an instance of Application. Also creates a panes list to hold each generated pane
   * @param {*} applicationHolder This is the page div that the elements should live within. Useful for Iodide where the document.body.append causes issues within the IDE side of it.
   * @param {*} [jsonData={}] this is the data that specifies the region boundaries of the json data. it is shared between all panes
   * @class Application
   */
  constructor(applicationHolder, jsonData = {}) {
    // important for traces in iodide
    console.log("tracing")
    // create the button
    /** The list holding all the generated panes, used at export time to collect all aspects of session state to write to json    */
    this.panes = []
    /** This is full set of all the geo_json files that specify the shape of the regions represented in the atlas provided as jsonData  */
    this.regionBoundaryData = jsonData
    /** This is the web element that the application will live in. Mostly for use in the iodide notebook, but any web element can be provided, and the tool can operation inside of that  */
    this.applicationHolder = applicationHolder
  }
  /**
   * This function is the application side of pane removal, there's another function used in the pane class, but this will ensure that the correct pane is taken out of the pane list 
   * @param {*} id this is the tagid of the pane that should get removed
   */
  removePane(id) {
    for (let ind = 0; ind < this.panes.length; ind++) {
      let pane = this.panes[ind]
      if (pane.paneDiv.id == id) {
        // splice out the specific pane
        this.panes.splice(ind, 1)
      }
    }
  }
  /**
   *Calls the add button option to create panes for your exploratory investigation of the fMRI data
   *
   * @memberof Application
   */
  runApp() {
    this.addButton()
    this.allPanes = document.createElement("div")
    this.allPanes.id = "allpanes"
    this.applicationHolder.append(this.allPanes)
    this.btn.click()
  }
  /**
   *Generates a button within the application holder for creating panes, exporting the session, and importing
   *
   * @memberof Application
   */
  async addButton() {
    // fetch the region boundary data
    /** This is the holder of all the buttons in the application program  */
    this.btndiv = document.createElement("div")
    this.btndiv.id = "btnholder"
    /** this is the add panes button  */
    this.btn = document.createElement("button")
    this.btn.onclick = this.addPane.bind(this)
    this.btn.setAttribute("id", "addbtn")
    this.btn.innerHTML = "Add Pane"
    this.btndiv.append(this.btn)
    this.applicationHolder.append(this.btndiv)
    // create the export button also 
    /** The export button  */
    this.exportBtn = document.createElement("button")
    this.exportBtn.innerHTML = "Export Session"
    this.exportBtn.addEventListener("click", this.export.bind(this))
    this.btndiv.append(this.exportBtn)
    // create the import button
    /** the import button  */
    this.importBtn = document.createElement("button")
    this.importBtn.innerHTML = "Import Session"
    this.importBtn.addEventListener("click", this.import.bind(this))
    this.btndiv.append(this.importBtn)
  }
  /**
   *Allows for the importing and initialization of panes from a previous session of investingation. Must dispatch most of the events that are generated by the user otherwise.
   *
   * @memberof Application
   */
  async import() {
    // do a fetch for a file 
    let readFile = (e) => {
      fetch(URL.createObjectURL(e.target.files[0]))
        .then(res => {
          return res.json()
        })
        .then(contents => {
          // run the application session loader
          this.sessionRecreator(contents)
        })
    }
    let inputFile = document.createElement("input")
    inputFile.type = "file"
    inputFile.onchange = readFile
    // trigger the opening of a file explorer window
    inputFile.click()
    // iterate over the panes

  }
  async sessionRecreator(importData) {
    for (let pane of importData.panes) {
      console.log(pane)
      await this.addPane()
      // select correct options
      let activePane = this.panes[this.panes.length - 1]
      // set the csvData from the pane to the paneObcsvText
      activePane.csvText = pane.csvText
      // find way to make it to createSelector
      this.ctrlop.csvDataReader()
      activePane.paneDiv.querySelector("#fillCol")
      this.ctrlop.createSelector()
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
        let btn = activePane.paneDiv.querySelector("#altfilterbutton")
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
      // set the csvname field
      activePane.paneDiv.querySelector("#csvfilename").innerHTML = pane.csvFilename

    }
  }
  /**
   *Allows for the Exporting of a session as a JSON file. Iterates over the panes, and takes all the existing attributes of the pane object minus the regionBoundaryData (13mb file). Creates a link element and a download name with a datestring at the time of export, and offers to download and save in the iodide notebook if you have signed in
   *
   * @memberof Application
   */
  export() {
    // create the export ob
    let expOb = { panes: [] }
    // iterate over the panes
    for (let pane of this.panes) {
      // collect the relevant information
      // omit the boundary file
      let { regionBoundaryData, application, ...rest } = pane
      rest.ta = pane.ta.value
      expOb.panes.push(rest)
    }
    let a = document.createElement("a")
    let today = new Date()
    let datename = `neuro_choropleth_session_${today.getFullYear()}_${today.getMonth()}_${today.getDate()}_${today.getHours()}_${today.getSeconds()}.json`
    a.download = datename    // note that the date elements start with 0 so december is going to be tthe 11th month, and jan is the 0th
    a.href = URL.createObjectURL(new Blob([JSON.stringify(expOb)]))
    a.click()
    // also allow to save in this notebook
    iodide.file.save(datename, 'json', expOb, { overwrite: true });


  }
  /**
   *Generation of elements that live within a pane in the application such as the ctrl options and the canvas. Attach a unique ID to the pane, region data, and csvData. Then create and initialize ctrloptions and canvas passing the paneholder and the pane object. Lastly add the pane to the application panes list
   *
   * @memberof Application
   */
  async addPane() {
    let newPane = new Pane(this.allPanes, this.panes.length)
    // pass reference to pane, to be used by ctrlOp and Canvas
    newPane.regionBoundaryData = this.regionBoundaryData
    // set the application removal function accessible in the newPane
    newPane.removeFromApplication = this.removePane.bind(this)

    // here's the point where we can connect up the various parts
    // finish pane loading

    // create ctrloptions
    /** This is a reference to the options for controlling the canvas (known as CtrlOp)   */
    this.ctrlop = new CtrlOp(newPane.paneDiv, newPane)
    // loads the data and such
    await this.ctrlop.init()

    // create the canvas
    /** The canvas that the slice and fill data is drawn on  */
    this.can = new Canvas(newPane.paneDiv, newPane, 500, 20)
    this.can.init()
    // target the canvas with our events
    this.ctrlop.target(this.can.can)

    // force draw the first slider value in frame
    this.ctrlop.slider.dispatchEvent(new Event("input"))

    this.panes.push(newPane)
  }
}
class Pane {
  /**
   *Creates an instance of Pane. Initiates construction of the ctrl op object for the pane all the buttons and stuff that have control over the canvas. Initiates creation of the canvas
   * @param {*} panesHolder This is the element that the pane will live within. Used in Iodide Notebook
   * @param {*} count This is the ID of the pane, helps track how many have been created.
   * @class Pane
   */
  constructor(panesHolder, count) {
    // generate the pane div
    // want radio w 3 buttons, range slider, selection form for loading
    let paneDiv = document.createElement("div")
    paneDiv.className = "pane"
    paneDiv.setAttribute("id", "pane" + count)
    /** The div that holds all the panes visible child elements.    */
    this.paneDiv = paneDiv
    /** The image that allows users to remove a pane if they screw up or something. */
    this.removeIcon = new Image()
    // xicon is a global created at the top of the notebook
    this.removeIcon.src = "https://raw.githubusercontent.com/DevinBayly/neuro-choro/iodide/x.png"
    this.removeIcon.id = "paneremoveicon"
    this.removeIcon.addEventListener("click", this.removePane.bind(this))
    this.paneDiv.append(this.removeIcon)
    /**  */
    this.panesHolder = panesHolder
    this.panesHolder.append(this.paneDiv)
  }

  loadRequestHandler(cb) {

    let readFile = (e) => {
      // make the name show in the pane of the csv you loaded
      this.csvFilename = e.target.files[0].name
      this.paneDiv.querySelector("#csvfilename").innerHTML = this.csvFilename

      fetch(URL.createObjectURL(e.target.files[0]))
        .then(res => {
          return res.text()
        })
        .then(contents => {
          this.csvText = contents
          // use the call back
          cb()
        })
    }
    return (e) => {
      // create the input type, click it, have the fetch
      let inputFile = document.createElement("input")
      inputFile.type = "file"
      inputFile.onchange = readFile
      // trigger the opening of a file explorer window
      inputFile.click()
    }
  }
  removePane() {
    //call the application remover that was set on the class instance
    this.removeFromApplication(this.paneDiv.id)
    //actually remove paneDiv
    this.paneDiv.remove()
  }
}
class CtrlOp {



  /**
   *Creates an instance of CtrlOp. Options include fill column specification, filters, view radio buttons, and slice sliders.  Meaningful attributes of ctrlOp state sliderIndex, sliceName brainView, sliceData, (brain region data) initialColData, filteredColData,colName, csvData (region fill data)
   * @param {*} paneDiv This is the div created by the pane to hold the ctrloptions elements
   * @param {*} paneOb The pane Object that facilitates sharing of values set in the ctrlop and the canvas. Also useful to set values on the pane object for export of sessions.
   * @class CtrlOp
   */
  constructor(paneDiv, paneOb) {
    /** Reference for the ctrlop back to the pane it lives in. Useful for sharing data with the canvas, and export  */
    this.paneOb = paneOb
    let ctrlDiv = document.createElement("div")
    ctrlDiv.className = "ctrlDiv"
    // add a section to the ctrldiv that clicking and dragging will actually move the entire paneholder
    paneDiv.append(ctrlDiv)
    /** The paneDiv that the ctrlDiv will live in  */
    this.paneDiv = paneDiv
    /** The div that holds all the child elements of the CtrlOp class   */
    this.ctrlDiv = ctrlDiv
    // this will be set to the canvas element to emit events that the canvas is set to listen for
    /** This is the canvas html element. Target for all the dispatched events meant to trigger setups and drawings on the canvas  */
    this.eTarget = undefined
  }
  /**
   *Set the eTarget class field to the param ele
   *
   * @param {*} ele This is an html element, in the case of this program, will only ever be the html5 Canvas element
   * @memberof CtrlOp
   */
  target(ele) {
    this.eTarget = ele
  }

  //
  /**
  *Main function for the setup of the Ctrlop actual elements and their values. This is called in the button click scope, where I believe we are permitted to perform an await before making the canvas
  *
  * @memberof CtrlOp
  */
  async init() {
    // setup the csvLoader button
    this.csvLoader()
    this.mkradio("axial")
    this.mkradio("sagittal")
    this.mkradio("coronal")
    // setup the radio buttons
    // selected is the radio button we have selected
    /** The view that has been selected to view the slices of the brain from. Stored on pane for export and import of sessions.
     * @alias brainView
     * @memberof Pane
     * @instance
    */
    this.paneOb.brainView = "sagittal" // default
    this.paneOb.paneDiv.querySelector("#radiosagittal").checked = true

    // create the brain slice slider
    this.createSlider()

    // set defaults
    // ensure that the slider only permits sagittal slice count
    this.paneOb.paneDiv.querySelector("#radiosagittal").click()

  }
  /**
   *This function creates a button that allows loading of a CSV data file. It also adds the result to the paneOb.
   *
   * @memberof CtrlOp
   */
  csvLoader() {
    // create buttons to upload csvData and sessionData
    let loadButton = document.createElement("button")
    let callback = () => {
      this.csvDataReader()
      this.createSelector()
    }

    let loadingCall = this.paneOb.loadRequestHandler(callback.bind(this))
    // how to make function that will call createSelector when the file has finished uploading
    loadButton.addEventListener("click", loadingCall)
    loadButton.innerHTML = "Upload CSV"
    this.ctrlDiv.append(loadButton)
    // make an area for the file naem to go
    let csvFileName = document.createElement("p")
    csvFileName.id = "csvfilename"
    this.ctrlDiv.append(csvFileName)

    let fillColDiv = document.createElement("div")
    fillColDiv.id = "fillcoldiv"
    /** create a constant placeholder for the fillcol selector*/
    this.fillColDiv = fillColDiv
    this.ctrlDiv.append(this.fillColDiv)
    // put in empty selector first
    let valueColumnSelect = document.createElement("select")
    valueColumnSelect.id = "fillCol"
    let uploadSuggest = document.createElement("option")
    uploadSuggest.innerHTML = "Upload a CSV to begin"
    uploadSuggest.value = "Upload a to begin"
    valueColumnSelect.append(uploadSuggest)
    this.fillColDiv.append(valueColumnSelect)


  }
  /**
   *Parse the text version of the CSV and create an object with each column name as a field and the values store in a list. CSV must contain a column named region that has exact name matches to the atlas file's region names, if nothing is drawing when using new CSV this is likely the main problem. Uses the paneOb.csvText set at the creation of the application. 
   *
   * @memberof CtrlOp
   */
  csvDataReader() {
    // turn this.csvText into a json that has the names of the columns as fields, and each has an array which is the data that follows
    // NOTE each row must either end with a \r or a \n
    let lines = this.paneOb.csvText.replace(/\r?\n/g, "---").split("---")
    let headers = lines[0].split(",")
    /** The parsed object of the initial CSV text. Each column header is now a field on the object, and a list of the numeric data in the column is the value.
     * @alias csvData
     * @memberof Pane
     * @instance
    */
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
  /**
   *Generate a radio button element for the specified brain view direction. Also attach the events which are sent along to the Canvas eTarget to trigger redraws on the canvas upon changing the brain view options. Ultimate drawing requires slice values from the slider to exist, but won't crash the program without them. Error messages coming from these missing values will go away upon a user interacting with the slider.
   *
   * @param {*} view Will be one of the 3 options, axial, sagittal, or coronal
   * @memberof CtrlOp
   */
  mkradio(view) {
    let rad = document.createElement("input")
    rad.type = "radio"
    // inclusion of panediv.id  makes the selection specific to the pane so that other panes don't get un checked when a selection is made
    rad.id = "radio" + view
    rad.name = "view" + this.paneOb.paneDiv.id
    rad.value = view
    let label = document.createElement("label")
    label.innerHTML = view
    let div = document.createElement("div")
    div.className = "radcontainer"
    div.id = "radcontainer" + view
    label.append(rad)
    div.append(label)
    this.ctrlDiv.append(div)
    // add this.paneOb.brainView on change
    rad.addEventListener("click", () => {
      this.paneOb.brainView = rad.value
      // also update the max for the slider
      // there's a chance that th sliderSlices haven't been instantiated, but wont crash, just doesn't send event to thecanvas until user has specified a slice
      this.slider.max = this.sliderSlices[this.paneOb.brainView].length - 1
      let e = new Event("radiobuttonchanged")
      if (this.eTarget) {
        let slice = this.paneOb.regionBoundaryData[this.sliderSlices[this.paneOb.brainView][this.paneOb.sliderIndex]]
        this.paneOb.sliceData = slice
        this.eTarget.dispatchEvent(e)
      }
    })
  }
  /**
   *This is the part for creating the column selection area. The options are taken from the csvData object fields. This option specifies which column's values create the fill colors used in the program. Specification also generates the fillColFilter, and the altColFilters.
   *
   * @memberof CtrlOp
   */
  createSelector() {

    // get rid of previous select dropdown if it exists
    if (this.paneOb.paneDiv.querySelector("#fillCol")) {
      this.paneOb.paneDiv.querySelector("#fillCol").remove()
    }
    // this is the selection element that is populated by the column names in the csv

    let valueColumnSelect = document.createElement("select")
    valueColumnSelect.id = "fillCol"
    for (let key of Object.keys(this.paneOb.csvData)) {
      let option = document.createElement("option")
      option.value = key
      option.innerHTML = key
      valueColumnSelect.append(option)
    }
    this.fillColDiv.append(valueColumnSelect)
    valueColumnSelect.onchange = () => {
      // make access to the selector possible

      /** This is the name of the column selected for use as the fill color of the regions drawn to the canvas.
       * @alias fillColValue
       * @memberof Pane
       * @instance
      */
      this.paneOb.fillColValue = valueColumnSelect.value
      // parse the data into numeric
      let numericData = this.paneOb.csvData[valueColumnSelect.value].map(e => parseFloat(e))

      /** This is a copy of the unfiltered numeric data in the fill column of the CSV.
       * @alias initialColData
       * @memberof Pane
       * @instance
      */
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
  /**
   *Helper function to generate a datastructure that specifies which region's boundaries are supposed to be drawn to the canvas according to the slider's position. Slices by View is an object with the 3 brain view fields, and a list of all the geojson filenames sorted as entries. Also creates the sliderMeasurements that populate the label next to the slice selection slider.
   *
   * @memberof CtrlOp
   */
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
    /** An object who's keys are the brain views, and values are lists of the slice files that match the paneOb.regionBoundaryData object. Used to figure out which slice's region boundaries are to be drawn on the canvas at any time   */
    this.sliderSlices = slicesByView
    // get the array of values
    /** A similar collection to the sliderSlices, but to populate the label next to the slice slider element so users can tell which slice (in mm) they are looking at   */
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
  /**
   *This creates the actual slider element and binds the events triggering canvas draws on changes to the slider.
   *
   * @memberof CtrlOp
   */
  createSlider() {
    // make a slider div
    let sliderDiv = document.createElement("div")
    sliderDiv.id = "sliderdiv"
    //initiate the slider
    let range = document.createElement("input")
    range.id = "rangeslider"
    let label = document.createElement("label")
    label.id = "rangesliderlabel"
    range.name = "slicerange"
    range.type = "range"
    label.setAttribute("for", "slicerange")
    sliderDiv.append(range)
    sliderDiv.append(label)
    this.ctrlDiv.append(sliderDiv)
    /** The html input element used to select the slice to draw.  */
    this.slider = range
    /** The label specifying which mm slice in the brain we are looking at  */
    this.sliderlabel = label
    // makes several attributes helpful for handling slider change
    this.prepRangeData()
    // draw a default slice
    this.slider.value = Math.round(this.sliderSlices.sagittal.length / 2)

    // add the on input event emitter  for when slider moves
    this.slider.oninput = () => {
      /** The slider value the user has selected   */
      this.selectedSliceIndex = parseInt(this.slider.value)
      // now determine which slice we are supposed to draw the boundaries of provided the selected brain view an the slice index
      let ind = parseInt(range.value)
      /** This is the value that the slider is currently set at. 
       * @alias sliderIndex
       * @memberof Pane
       * @instance
      */
      this.paneOb.sliderIndex = ind
      // name is helpful at time of export
      let name = this.sliderSlices[this.paneOb.brainView][ind]
      /** This is the name of the slice file that we are drawing to the canvas. The actual name was once a geojson file in a directory, but now it also corresponds to an object within the regionBoundaryData attribute of the Pane as well as the application.
       * @alias sliceName
       * @memberof Pane
       * @instance
      */
      this.paneOb.sliceName = name
      this.sliderlabel.innerHTML = this.sliderMeasurements[this.paneOb.brainView][ind]
      /** This is the particular value of the slice displayed on the canvas. Can be positive or negative and is followed by a unit of "mm".
       * @alias sliceMeasure
       * @memberof Pane
       * @instance
      */
      this.paneOb.sliceMeasure = this.sliderlabel.innerHTML
      // provide the name of the slice to the canvas drawing machinery
      // sliderchange is a custom event that the canvas is listening for
      let e = new Event("sliderchange")
      if (this.eTarget) {
        let slice = this.paneOb.regionBoundaryData[this.sliderSlices[this.paneOb.brainView][this.paneOb.sliderIndex]]

        /** This is the actual object containing the regions boundary coordinates for the particular slice the user has specified using the slider and the brain view options.
         * @alias sliceData
         * @memberof Pane
         * @instance
        */
        this.paneOb.sliceData = slice
        // dispatch to the eTarget the canvas
        this.eTarget.dispatchEvent(e)
      }
    }
  }
  /**
   *Prepare the filters. Remove the existing fillFilter if it exists so that duplicate elements don't get created. Perform the same thing for the AltColumnFilters holder.
   *
   * @memberof CtrlOp
   */
  createFilters() {
    if (this.fillFilter) {
      this.fillFilter.remove()
    }
    /** This is the filter allowing to only color fill regions greater than the min value and less than the max. Helpful for ascertaining which areas with similar coloration are actually higher or lower values.  */
    this.fillFilter = new FillColFilter(this.ctrlDiv, this.paneOb.initialColData, this.eTarget, this.paneOb)
    this.fillFilter.init()
    // set them at default values
    // categorical filters
    if (this.altFilters) {
      this.altFilters.remove()
    }
    /** The alternate column filter. Allows for pairing down which regions are colored based on rules set on   */
    this.altFilters = new AltHolder(this.ctrlDiv, this.paneOb)
    this.altFilters.init()


  }
}
class AltColumnFilters {
  /**
   *Creates an instance of AltColumnFilters.
   * @param {*} outerHolder This is the html div element holder for each row of filters.
   * @param {*} paneOb This is the pane object provided here to store values important to drawing the brain slice choropleth and exporting the session
   * @class AltColumnFilters
   */
  constructor(outerHolder, paneOb) {
    /** This holder is the AltColumn holder which itself lives in the ctrldiv above the canvas. Elements of the altColumn filter row get placed in here  */
    this.outerHolder = outerHolder
    /** The pane reference to store values meant to be share with canvas, or used in export  */
    this.paneOb = paneOb
    /** The individual row holder which gets added to the outer holder  */
    this.holder = document.createElement("div")
    this.holder.className = "altFilterRow"
    // used for tooltip and ultimate session export
    /** the export info of the alt column, used for populating the tooltips that appear after clicks happen on top of canvas regions  */
    this.expInfo = {}
    //

  }

  /**
   *Process should look like, first have a selector for the column names of the csv then on select, detect whether you should make numerical or categorical options make selections for the == and != , then the unique column if categorical or input for numeric comparison
   *
   * @memberof AltColumnFilters
   */
  init() {
    this.outerHolder.append(this.holder)
    // create element that takes away the filter row
    /**  */
    this.removeBtn = new Image()
    this.removeBtn.src = "https://raw.githubusercontent.com/DevinBayly/neuro-choro/iodide/x.png"

    this.removeBtn.addEventListener("click", this.removeSelf.bind(this))
    this.holder.append(this.removeBtn)
    // make the first select element of the csv columns
    this.columnSelector()
  }
  /**
   *The intial selector specifying which CSV column to use as the altFilter.Triggers operations and value selector creation on change 
   *
   * @memberof AltColumnFilters
   */
  columnSelector() {
    /**  The drop down selector for the column of the csv data to use as the alternate column filter   */
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
    // run it once to set options for default selection
    this.generateOperations()
    this.altColSelect.onchange = this.generateOperations.bind(this)

  }
  /**
   *Handles creation of operation and value selector creation. Interprets the selected CSV column as categorical or numeric and provides the appropriate operation and value selector options. < or > for numeric. == or != for categorical. Also triggers initial creation of bool mask array created from iterating over the specified alternate column and comparing each element to the chosen operation and value. the boolmask 
   *
   * @memberof AltColumnFilters
   */
  generateOperations() {
    // remove previous elements if created
    if (this.operation) {
      this.operation.remove()
    }
    if (this.valueSelector) {
      this.valueSelector.remove()
    }
    // check whether the column is numeric
    this.expInfo["name"] = this.altColSelect.value
    this.paneOb.altFiltersState[this.id].colname = this.altColSelect.value
    if (parseFloat(this.paneOb.csvData[this.altColSelect.value][0])) {
      // the value was numeric, t
      /** The Operation drop down who's possible options are dependent on the selected csv column featuring numeric or categorical data  */
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
      /** The value drop down list that is combined with the selected operation to generate a bool mask array from the selected alternate CSV column   */
      this.valueSelector = document.createElement("input")
      this.valueSelector.type = "text"
      this.valueSelector.id = "val"
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

  /**
   *Generate a 0 1 vector to determine whether the filter should keep or toss a fillColumn value. Stores selected state of filter row in the paneOb.altFilterState and the expInfo fields. The altChange event is dispatched to tell the holder of the altFilters to filter the initialColData through each of the row's bool masks and only fill values on the canvas that come from rows that pass all altColumnFilters
   *
   * @memberof AltColumnFilters
   */
  mask() {
    this.expInfo["operation"] = this.operation.value
    this.expInfo["value"] = this.valueSelector.value
    this.paneOb.altFiltersState[this.id].op = this.operation.value
    this.paneOb.altFiltersState[this.id].val = this.valueSelector.value
    /** The list of 1's and 0's corresponding to whether the element at a particular index in the alternate column passes the logical comparison to the filter's specific operation and value choices  */
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
  /**
   *Generate a list of the unique elements of a column.
   *
   * @memberof AltColumnFilters
   */
  findUniqueElements() {
    /** The collection of unique values in a categorical column of CSV Data  */
    this.uniqueSet = []
    for (let element of this.paneOb.csvData[this.altColSelect.value]) {
      if (this.uniqueSet.indexOf(element) == -1) {
        this.uniqueSet.push(element)
      }
    }
  }

  /**
   *Make it possible to take the filter row out of the AltHolder list.
   *
   * @memberof AltColumnFilters
   */
  removeSelf() {
    // triggered by clicking the exit button
    this.holder.remove()
    // take self out of the filter list on the AltHolder ob
    // this is a function set by the AltHolder on each row it creates
    this.removeFromList(this)
  }
}



class AltHolder {
  /**
   *Creates an instance of AltHolder. Generates a button to add altRows an instantiates the list to hold each filter object
   * @param {*} ctrlDiv The html element that the button and all the rows will live in
   * @param {*} paneOb The pane ob present here to assist in passing values to canvas to draw, and ultimately the export of a session
   * @class AltHolder
   */
  constructor(ctrlDiv, paneOb) {
    // button and larger div for the elements to get added in
    /** The CtrlOp div holder  */
    this.ctrlDiv = ctrlDiv
    /** The pane referenc to store values necessary for export such as altFiltersState */
    this.paneOb = paneOb
    /** The button that generates rows of alt filter options  */
    this.createAltRowBtn = document.createElement("button")
    this.createAltRowBtn.innerHTML = "Create Alt Column Filter"
    this.createAltRowBtn.id = "altfilterbutton"
    /** The list holding the generated alt filters  */
    this.altfilters = []
  }
  /**
   *Start the idcount for each row used in the deletion  of rows and initialize the altFilterState field on the paneOb which is used for export
   *
   * @memberof AltHolder
   */
  init() {
    /** The holder for the AltHolder's elements and its children's elements as well  */
    this.holder = document.createElement("div")
    this.holder.id = "altcolholder"
    this.createAltRowBtn.onclick = this.addRow.bind(this)
    this.holder.append(this.createAltRowBtn)
    this.ctrlDiv.append(this.holder)
    /** the id passed to the altfilter row. Used to uniquely identify each row for export and removal operations  */
    this.idCount = 0
    // attach the altfilters to the paneOb for export
    /** testing 
     * @alias altFiltersState
    * @memberof Pane
    * @instance
    */
    this.paneOb.altFiltersState = {}

  }
  /**
   *Function that is called upon clicking the add row button for the filterholder. Set the removal function that is to activate upon clicking the X button of the row. Set the listener to filter upon receiving an altchange event
   *
   * @memberof AltHolder
   */
  addRow() {
    let newAlt = new AltColumnFilters(this.holder, this.paneOb)
    newAlt.id = this.idCount
    this.idCount++
    // add to the pane collection for export as well
    this.paneOb.altFiltersState[newAlt.id] = { colname: "", op: "", val: "" }
    newAlt.init()
    // add the removal function to take it from the list too

    newAlt.removeFromList = this.removeFromList.bind(this)

    this.altfilters.push(newAlt)
    this.holder.addEventListener("altchange", this.filter.bind(this))


  }
  /**
   *iterate over the altfilters, and then only let through the ones that work with each bool mask reduce on the intiial paneob data iterate over all the individual boolmask values. Failing the criteria of even one of the altRows means that the ultimate filteredAltColData element at that index i should be NaN or correspond to a gray filled region. Dispatch the filtered change event and setup and draw results to the canvas.
   *
   * @memberof AltHolder
   */
  filter() {


    /** This is the representation of the fill column after the alt column filters have been applied to it. This data will be combined with the fillColFilterData when it is time to draw to the canvas.
     * @alias filteredAltColData
     * @memberof Pane
     * @instance
    */
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

    /** This is the active alternate column filter information used for the creation of tooltips. 
     * @alias altFilterInfo
     * @memberof Pane
     * @instance
    */
    this.paneOb.altFilterInfo = ""
    for (let altfilter of this.altfilters) {
      //
      this.paneOb.altFilterInfo += JSON.stringify(altfilter.expInfo)
    }
  }
  /**
   *This function is provided to each row to assist in removing it from the active alt filtering options. Must also remove the filter from the paneOb so that exported sessions don't import the wrong filtering options.
   *
   * @param {*} ele bound to the this of the altfilter row. 
   * @memberof AltHolder
   */
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
  /**
   *remove the altHolder. used for when fill columns need to generate a new set of filters, and duplicate elements are generated otherwise.
   *
   * @memberof AltHolder
   */
  remove() {
    this.holder.remove()
    this.createAltRowBtn.remove()
  }

}
class FillColFilter {
  /**
   *Creates an instance of FillColFilter.
   * @param {*} ctrlDiv the html element holder of the fill filter .
   * @param {*} data the intial data that will be filtered depending on the state of the min and max elements
   * @param {*} eventTarget this is the canvas element which we emit events to so that drawing occurs
   * @param {*} paneOb the paneobject which values are stored on so the canvas can reference, and exporting can occur
   * @class FillColFilter
   */
  constructor(ctrlDiv, data, eventTarget, paneOb) {
    /** the minimum value for data in the fill color column,   */
    this.min = undefined
    /** the max allowed value for the fill color column */
    this.max = undefined
    /** the ctrlop div that we should add the div sliders to */
    this.ctrlDiv = ctrlDiv
    /** The initial data which will be filtered and stored on the paneOb for the canvas to access */
    this.data = data
    /** The canvas html element to dispatch events on */
    this.eTarget = eventTarget
    /** The paneOb reference to store data for canvas use and export */
    this.paneOb = paneOb
  }
  //remove the previous filter elements
  /**
   *destroy the html elements corresponding to the filter to prevent duplicate elements from getting generated
   *
   * @memberof FillColFilter
   */
  remove() {
    // remove the para, and filterdiv
    this.para.remove()
    this.filterDiv.remove()
    this.labelholder.remove()
    this.maxel.element.remove()
    this.minel.element.remove()
  }
  /**
   *initialize the fill filters. Generate a min and max div element that responds to mouse events that can slide within an area of 1/4th the width of the ctrldiv. Generate an interpolator to make - and + values possible given the data in the fill column that we are filtering. Additional Limit closures are provided to specialize the div objects of the divMaker class to each of the min and max responsibilities. Also set closure on paneOb that enables setting values without mouse involvement.
   *
   * @memberof FillColFilter
   */
  init() {
    // make a paragraph element that has the title of the fill col filter
    let para = document.createElement("p")
    para.id = "colfilterTitle"
    para.innerHTML = "Fill Color Filter"
    this.para = para
    this.ctrlDiv.append(para)
    // make a range slider that updates the self filter function which is called later on activity data
    let rangeWidth = this.ctrlDiv.getBoundingClientRect()
    // the holder for the min and max elements
    let filterDiv = document.createElement("div")
    filterDiv.className = "fillFilterDiv"
    this.filterDiv = filterDiv
    // add the background part of the slider
    let backline = document.createElement("div")
    backline.id = "backline"
    this.backline = backline
    filterDiv.append(backline)
    this.ctrlDiv.append(filterDiv)
    let min = new divMaker(rangeWidth.width / 4, filterDiv)
    let max = new divMaker(rangeWidth.width / 4, filterDiv)


    // establish the absmin and absmax of the column data
    // raise hell if the data can't be sorted this way
    this.setbounds(Math.min(...this.data), Math.max(...this.data))
    // makes it easier to have the sliders present correct values even when negatives are involved
    /** Interpolator instance to provide values in the fill column range given values 0 to 1 related to slider div placement on page */
    this.interpolator = interpolator()
    // values of v go in which range from 0 to 1
    // the additional -1 and +1 make it so that we can still see all the data if the sliders are set to their extremes
    this.interpolator.setup(0, this.absmin - 1, 1, this.absmax + 1)

    /** This is the html element for the max fill slider  */
    this.maxel = max
    /** This is the html element for the min fill slider  */
    this.minel = min
    // make the draggable elements catch movement events and ensure that the filter method gets called when dragging stops
    this.maxel.element.addEventListener("divmoved", this.filter.bind(this))
    this.minel.element.addEventListener("divmoved", this.filter.bind(this))
    // this si the amount of screen space that the filter div's can move, minus the width of the element
    /** This is the static width of the fill slider area, 1/4 of the ctrldiv's width less 30 which is the width of a div slider */
    this.width = (rangeWidth.width / 4) - 30
    // create labels
    /** The min slider value, this changes when the div moves */
    this.minlabel = document.createElement("p")
    this.minlabel.id = "minlabel"
    this.minlabel.className = "filterLabel"
    /** The max slider value, which changes due to user interaction with the div */
    this.maxlabel = document.createElement("p")
    this.maxlabel.id = "maxlabel"
    this.maxlabel.className = "filterLabel"
    let labelholder = document.createElement("div")
    labelholder.id = "labelholder"
    this.labelholder = labelholder
    // prevent sliders from going over each other
    min.additionalLimit = (v) => {
      // stay below the max point
      let maxleft = parseInt(max.element.style.left)-10
      if (v > maxleft) {
        min.element.style.left = `${maxleft}px`
        /** The minimum value. This is actually a measure in pixels from the side of the pane's bounding box. Not in the range of actual CSV data yet, will be set to zero if it is dragged beyond the pane's bounding box */
        this.min = maxleft
        // update min label
        this.minlabel.innerHTML = this.interpolator.calc(maxleft / this.width).toFixed(3)
        return true
      }
      // used at filter time
      this.min = v
      // update min label and account for the divslider width
      this.minlabel.innerHTML = this.interpolator.calc(v / this.width).toFixed(3)
      return false
    }
    max.additionalLimit = (v) => {
      let minleft = parseInt(min.element.style.left)+10
      if (v < minleft) {
        max.element.style.left = `${minleft}px`
        /**  The maximum value. Again, this is actually a measure in pixels from the side of the pane's bounding box. Not in the range of actual CSV data yet, will be set to zero if it is dragged beyond the pane's bounding box  */
        this.max = minleft
        this.maxlabel.innerHTML = this.interpolator.calc(minleft / this.width).toFixed(3)
        return true
      }
      this.maxlabel.innerHTML = this.interpolator.calc(v / this.width).toFixed(3)
      // used at filter time
      this.max = v
      return false
    }
    labelholder.append(this.minlabel, this.maxlabel)
    filterDiv.append(min.element)
    filterDiv.append(max.element)
    this.ctrlDiv.append(labelholder)
    // once placed, set this to keep in correct spot, make them sit on same line
    max.element.style.top = `-30px` // overlap the element with the other
    max.element.style.left = "50px"

    // provide a way to initialize values via styling from import
    /** A function that allows creation of fill filter defaults at import time
     * @alias updateFillFilter
     * @memberof Pane
     * @function
     * @instance
     * @param {*} importMin The min value that the slider should be set to
     * @param {*} importMax the max value that the slider should be set to
    */
    this.paneOb.updateFillFilter = (importMin, importMax) => {
      // move the divs
      min.element.style.left = importMin + "px"
      max.element.style.left = importMax + "px"
      // populate the instance variables, and labels
      min.additionalLimit(importMin)
      max.additionalLimit(importMax)
    }
  }
  /**
   *Filter the initial data passed in upon filter construction and determine the fill value from interpolation on the min and max elements position on the screen. Store the values in the paneOb for export. generate a filteredFillColData on the paneOb for the canvas drawing. dispatch the filter change event.
   *
   * @memberof FillColFilter
   */
  filter() {
    // calculate the actual min activity value
    let fillmin = this.interpolator.calc(this.min / this.width).toFixed(3)
    let fillmax = this.interpolator.calc(this.max / this.width).toFixed(3)
    // give this information to the paneOb,useful for tooltips
    /** The min value in the fill data range used for filtering the fill column's data.
     * @alias fillmin
     * @memberof Pane
     * @instance
    */
    this.paneOb.valFilterMin = fillmin
    /** The max value in the fill data range used for filtering the fill column's data.
     * @alias fillmax
     * @memberof Pane
     * @instance
    */
    this.paneOb.valFilterMax = fillmax
    /** The data from the fill color column filtered by the min and max sliders, passed to the paneOb to be combined with the altColFilteredData at time of canvas setup and draws.
     * @alias filteredFillColData
     * @memberof Pane
     * @instance
    */
    this.paneOb.filteredFillColData = this.data.map(e => {
      // handle the three cases that one or the other (min or max) is set, or both
      if (!isNaN(fillmin) && !isNaN(fillmax)) {
        if (e >= fillmin && e <= fillmax) {
          return e
        }
      } else if (!isNaN(fillmin)) {
        if (e >= fillmin) {
          return e
        }
      } else {
        if (e <= fillmax) {
          return e
        }
      }

      return NaN
    })
    // emit an actual canvas filtered event 
    let e = new Event("filterChange")
    this.eTarget.dispatchEvent(e)

  }
  /**
   *Establish the min and max values for the fill filter based on the parameters provided
   *
   * @param {*} absmin minimum value for the fill data
   * @param {*} absmax maximum value for the fill data
   * @memberof FillColFilter
   */
  setbounds(absmin, absmax) {
    /** This is a absolute max of the fill data column that was selected by the user  */
    this.absmax = absmax
    /** This is the absolute min of the fill data column selected by the user  */
    this.absmin = absmin
  }
}

class divMaker {
  /**
   *Creates an instance of divMaker. 
   * @param {*} width The width of the entire draggable range for the div, should be  1/4th the space of the ctrldiv element
   * @param {*} holder The element that the divs will live within, this should be the fill filter holder.
   * @class divMaker
   */
  constructor(width, holder) {
    let d = document.createElement("div")
    /** This is the html element that is styled to appear as a slider for use in the fillColor filters */
    this.element = d
    d.style.height = "30px"
    d.style.width = "30px"
    d.style.position = "relative"
    d.style.margin = "0"
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
      /** This is a numeric representation of how far from the left side of the parent element's bounding box the element is to be positioned. This value when divided by the total width of the slider's range gives a 0 to 1 value that can be converted into the numeric range of the fill column selected by the user for filtering values above the max and below the min. */
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
    d.style.background = "rgb(157,157,157,.8)"
    d.style["border-radius"] = "15px"
  }
  // this function is replaced in the instances of the object, class inheritance case
  additionalLimit(v) {
    return undefined
  }
}

class Canvas {

  /**
   *Creates an instance of Canvas. Holds stuff like the global min/max, the invisible and visible canvases, the boundary lines, and various interpolators use the ctrlInstance to get things like boundary data, and fill data when the values change use paneOb when there are needs for boundary data or filteredColData
   * @param {*} paneDiv Reference to the pane's div to add the canvas to
   * @param {*} paneOb paneOb reference for retrieving and storing data important for line paths, fills, and export of sessions
   * @param {*} size Size of the canvas element, will use this for both width and height
   * @param {*} margin Amount of white space around the drawing 
   * @class Canvas
   */
  constructor(paneDiv, paneOb, size, margin) {
    /** The amonut of pixels of space outside the drawing area of brain data */
    this.margin = margin
    /** The width and length measure of the canvas size  */
    this.size = size
    /** The html canvas element that we draw on.  */
    this.can = document.createElement("canvas")
    // the invisible canvas is used to assist with the mapping of clicks to uniquely colored regions whose pixels can be queried for color strings mapping to region names
    // easy hack to keep performance and accuracy of interactivity on canvas
    /** This canvas is used in ascertaining which region a mouse click has occured on. It isn't drawn to the screen, but instead has each region filled with a unique color at draw time, and the pixel value that lies under a mouse click can be used to map directly to the region name that red,green,blue pixel corresponds to in the colToRegMap attribute of the canvas.  */
    this.invisican = document.createElement("canvas")
    this.invisican.id = "invisican"
    // makes resizes not affect xy of canvas
    /** The div element that the canvas is placed in */
    this.canvasHolder = document.createElement("div")
    this.canvasHolder.id = "canvasHolder"
    /** The holder for all the tooltip html elements  */
    this.infoHolder = document.createElement("div")
    this.infoHolder.className = "infoHolder"
    // other versions of teh data will be around later,
    // get data for boundaries and selected value column
    /** The div that the pane object owns which all the children html elements are added to  */
    this.paneDiv = paneDiv
    /** The paneOb reference to store data for canvas use and export */
    this.paneOb = paneOb
    /** This is the dictionary that holds the tooltips created when a region is clicked with the mouse, and the region names of the brain slices are the lookup keys. 
     * @memberof Pane
     * @alias rois
     * @instance
    */
    this.paneOb.rois = {}
    // setup the text area for note taking
    /** This is the textarea html element that notes can be put on indicating what was thought to be useful information regarding the slice and filters that were selected. 
     * @memberof Pane
     * @instance
     * @alias ta
     * 
     */
    this.paneOb.ta = document.createElement("textarea")
  }
  /**
   *Generate a map of region names to actual numerical values. Store the object on the paneOb as dataForPlot to use in plotting tools.
   *
   * @memberof Canvas
   */
  makeRegDataMap() {
    /** This is the region name to value map that is referenced when fill colors are being selected for a region during draw(). The region names are the keys and the numeric data of the fill column becomes the values */
    this.regNameToValueMap = {}
    // drawregions without fill if nothing selected yet
    if (this.fillData == undefined) {
      this.paneOb.csvData["region"].map((e, i) => {
        this.regNameToValueMap[e.replace(/\s/, "")] = NaN
      })
    } else {
      this.paneOb.csvData["region"].map((e, i) => {
        let name = e.replace(/\s/, "")
        // help determine if there's multiple rows with this region's data
        if (this.regNameToValueMap[name]) {
          // reset the region rois for the multiples
          if (this.paneOb.rois[name]) {
            if (/[\s\S]Multiple/.exec(this.paneOb.rois[name])) {
              delete this.paneOb.rois[name]
            }
          }
          // prev value mult by the prev count + new div count +1 == rolling ave
          let prev = this.regNameToValueMap[name]
          if (!isNaN(prev.value) && !isNaN(this.fillData[i])) {
            this.regNameToValueMap[name] = { value: (prev.value * prev.count + this.fillData[i]) / (prev.count + 1), count: prev.count + 1 }
            // make a note that there is a row with multiple entries in the current slice
            this.paneOb.rois[name] = `
            <h3>Selected Region
              <p class="tooltip-child" id="regionname">
                    ${ name}
              </p>
              <p class="tooltip-child">
              <p>Multiple CSV row entries for region</p>
              <p>Utilize Filters to view separately</p>
            <p>average value: ${this.regNameToValueMap[name].value.toFixed(3)}
            </h3>
            `
          }
        } else {
          if (!isNaN(this.fillData[i])) {
            this.regNameToValueMap[name] = { value: this.fillData[i], count: 1 }
          }
        }
      })
    }
    /**This attribute enables simple tools to access the filtered data being used for coloring the region so that it may be plotted
     * @alias dataForPlot
     * @memberof Pane
     * @instance
    */
    this.paneOb.dataForPlot = Object.entries(this.regNameToValueMap).reduce((prev, [k, v]) => {
      prev[k] = v.value
      return prev
    }, {})
  }
  /**
   *The initialization of the canvas. Add elements like the canvas (invisible one too), textarea, and infoholders to the canvasHolder field on the class. Create listeners for events that trigger setup and draw functions to execute.
   *
   * @memberof Canvas
   */
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
    /** This is the html canvas element context used for drawing lines and filling shapes on the canvas */
    this.ctx = this.can.getContext("2d")
    /** This is the drawing context for the invisible canvas */
    this.invisictx = this.invisican.getContext("2d")
    // calculate the regionSize min and max for all the slices, and allow us to scale the canvas content depending on that in the future
    this.calcRegionSizeGlobal()
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
  /**
   *This function determines what the final fill data should look like according to the presence or absence of FillFilters and AltFilters. Also uses this data to calculate global min and max of the fillData to use in color interpolation, and interpolators between the range of region coordinates and canvas screen space. Also Calculates the unique color set to fill in the invisible canvas for mouse queries.
   *
   * @memberof Canvas
   */
  setupCanvas() {
    // mingle the two filtered datasets 
    /** This is a helper attribute that will hold the values that have passed all available filters */
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
    if (this.paneOb.csvData) {
      this.makeRegDataMap()
    }
    // initialize the color setting for the invisican
    let cc = color_collection(this.paneOb.sliceData.features.length)
    /** This is the map that has red,green,blue strings as keys to look up region names. an example pair would be "15,22,180":"PL_Op_L" */
    this.colToRegMap = {}
    /** This is the inverse of the colToRegMap */
    this.regToColMap = {}
    this.paneOb.sliceData.features.map((f, i) => {
      // this is for the fill on the invisible canvas
      this.regToColMap[f.properties.regionName] = cc.array[i]
      this.colToRegMap[JSON.stringify(cc.array[i])] = f.properties.regionName
    })
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
    /** This is the interpolator for converting region coordinate y values to the y axis of the canvas. Don't forget that 0 is the top of the canvas which is why in the setup code the full height minus the margin is mapped to the min value of the region size */
    this.yinterp = yinterp
    /** This is the interpolator for converting the x coordinates of a region's boundary to the x dimension of the canvas.  */
    this.xinterp = xinterp
  }
  /**
   *This function generates a div element with specific innerHTML to append to the infoholder. Only happens for mouseclicks within a region to generate information about the region beneath the canvas. These tooltips disappear when no longer viewing a slice that features that region.
   *
   * @param {*} regionName
   * @param {*} inner
   * @memberof Canvas
   */
  tooltipMaker(regionName, inner) {
    // make a little side box with the info in it
    // take away a chunk of the image at that area
    // remove any improper characters for the id
    let id = regionName.replace(/[-_]/g, "")
    let rightDiv = document.createElement("div")
    rightDiv.id = "tooltip" + id
    rightDiv.className = "tooltipholder"
    rightDiv.innerHTML = inner        //put new info in front of notes to canvas element if possible
    this.infoHolder.prepend(rightDiv)
    // add tooltip to the rois tooltip array
  }
  // add a tracker for regions clicked
  // populate elements on canvas like roi's which stores the region name, 
  // at draw time if region is in the roi list stroke it in purple, or green? ask josh what he thinks?
  // look at complementary colors for r b 
  // if they click in the same region again it should toggle it off and out of the listing
  /**
   *This function converts the position x,y of a mouseclick on the visible canvas into a pixel's rgb values taken from the invisible canvas where each region has unique filling colors. This rgb string then is used to determine which region the click originated in, and an entry is added to the regions of interest (rois) attribute on the canvas class, as well as the paneOb. We then redraw to include a yellow border around the region that was clicked
   *
   * @param {*} e the mouse click event
   * @memberof Canvas
   */
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
            <p>value: ${this.regNameToValueMap[regionName].value.toFixed(3)}
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

  /**
   *Figure out how much actual space the brain region data takes up. Important for setting the bounds of the interpolator that converts from region coordinate space to canvas space
   *
   * @memberof Canvas
   */
  calcRegionSizeGlobal() {
    // this should only get done once
    // scanCol is the column that has the data we care about putting in the color fill
    // this returns a summary object that knows things about the size of the brain json dimensions and also the min and max of hte scan data
    //!! should only do this part once
    let globals = [1000, 1000, -1000, -1000]
    for (let sliceName in this.paneOb.regionBoundaryData) {
      let slice = this.paneOb.regionBoundaryData[sliceName]
      for (let feature of slice.features) {
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
    }
    /** This is a list of smallest and largest values found in the x,y dimensions within the geojson data provided. This is used to scale the region coordinates to the space of the canvas  */
    this.regionSizes = globals
    /** This is a ratio of the heightvs the width of the brain data. Helpful for determining what the maximum value of our y interpolator should be.  */
    this.canvasRatio = globals[3] / globals[2]
  }

  /**
   *Calculate the min and max of the fill column provided to the canvas class
   *
   * @memberof Canvas
   */
  calcValueColMinMax() {
    let noNan = this.fillData.reduce((acc, cur) => {
      if (!isNaN(cur)) {
        acc.push(cur)
      }
      return acc
    }, [])
    // if the panehas a filter min and max set, scan datamin and max should be equal
    if (!isNaN(this.paneOb.valFilterMin)) {
      this.scanDatamin = this.paneOb.valFilterMin
    } else {
      /** These values are the min of the entire fillData provided to the canvas. This is used in linearly interpolating the color of the fill for a region if it has data. This is the minimum value */
      this.scanDatamin = Math.min(...noNan).toFixed(3)
    }
    if (!isNaN(this.paneOb.valFilterMax)) {
      this.scanDatamax = this.paneOb.valFilterMax

    } else {
      /** This is the maximum value of the fillData for the canvas. */
      this.scanDatamax = Math.max(...noNan).toFixed(3)
    }
    // this normalizes the value from the scan data into the range 0 to 1 for color interpolation
    /** color interpolators for fill */
    this.colInterpolator = interpolator()
    this.colInterpolator.setup(this.scanDatamin, 0, this.scanDatamax, 1)
    // calculate the min and maxes of the scan data for each scan
  }


/**
 *The all important drawing function. Responsible for clearing out old tooltips, generating color interpolators (gray to red + values) (blue to gray for - values). Actual lines are created by iterating over the features of the geojson slice specified by the brain view and the slider. paths are created for the visible and invisible canvases, and yellow strokes are provided for areas that are specified in the rois field on the canvas class. Fill values are linearly interpolated to the color scheme selected if the value for the specific isn't NaN.
 *
 * @memberof Canvas
 */
drawCanvas() {
  //TODO find better version of how to structure so that the margin can be programmatically set
  this.ctx.clearRect(0, 0, this.can.width, this.can.height)
  this.invisictx.clearRect(0, 0, this.can.width, this.can.height)
  // remove previous tooltips
  while (this.infoHolder.firstChild) {
    this.infoHolder.removeChild(this.infoHolder.firstChild)
  }
  let red = {
    r: 227, g: 74, b: 51
  }
  let gray = {
    r: 254, g: 232, b: 200
  }
  let blue = {
    r: 67, g: 162, b: 202
  }
  // iterate over the boundary data
  for (let region of this.paneOb.sliceData.features) {
    // this is the object that has features, and properties
    for (let coords of region.geometry.coordinates) {
      this.ctx.lineWidth = 2
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
          this.ctx.strokeStyle = "black"
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

      // default stroke gray, update if nec
      this.ctx.strokeStyle = "gray"
      this.ctx.stroke()
      // these aren't defined yet
      if (this.regNameToValueMap != undefined) {
        if (this.regNameToValueMap[linedata.region]) {
          let scanData = this.regNameToValueMap[linedata.region].value
          let lerpc
          if (scanData < 0) {
            // use the blue to gray instead of gray to red
            let t = this.colInterpolator.calc(scanData)
            lerpc = LerpCol(blue, gray, t)
          } else {
            let t = this.colInterpolator.calc(scanData)
            lerpc = LerpCol(gray, red, t)
          }
          this.ctx.fillStyle = lerpc
          this.ctx.fill()
          // query the region to color map
        }
      }
      this.invisictx.fillStyle = `rgb(${this.regToColMap[linedata.region][0]},${this.regToColMap[linedata.region][1]},${this.regToColMap[linedata.region][2]})`
      this.invisictx.fill()
    }
  }
  if (this.scanDatamin != undefined && this.scanDatamax != undefined) {
    // setup a legend in the corner
    let gradient = this.ctx.createLinearGradient(0, 0, 0, this.can.height / 4)
    // color stop for rgb
    if (this.scanDatamin < 0 && this.scanDatamax > 0) {
      gradient.addColorStop(1, `rgb(${blue.r},${blue.g},${blue.b})`)
      gradient.addColorStop(.5, `rgb(${gray.r},${gray.g},${gray.b})`)
      gradient.addColorStop(0, `rgb(${red.r},${red.g},${red.b})`)
    } else if (this.scanDatamax > 0) {
      gradient.addColorStop(1, `rgb(${gray.r},${gray.g},${gray.b})`)
      gradient.addColorStop(0, `rgb(${red.r},${red.g},${red.b})`)
    } else {
      // this is the case of blue only
      console.log(this.scanDatamax, "max", this.scanDatamin, "min")
      gradient.addColorStop(0, `rgb(${gray.r},${gray.g},${gray.b})`)
      gradient.addColorStop(1, `rgb(${blue.r},${blue.g},${blue.b})`)
    }
    let gradientWidth = 10
    this.ctx.fillStyle = gradient
    let startx = this.can.width - this.margin - gradientWidth
    let endx = this.can.width - this.margin * 2
    this.ctx.fillRect(startx, 0, endx, this.can.height / 4)
    // add numeric values to the gradient
    // measure the text so it sits right next to the gradient
    this.ctx.font = "15px Arial"
    let minmeasure = this.ctx.measureText(this.scanDatamin).width
    let maxmeasure = this.ctx.measureText(this.scanDatamax).width
    this.ctx.fillStyle = "black"
    // the -5 is a spacer for the text next to the gradient bar
    this.ctx.fillText(this.scanDatamin, startx - minmeasure - 5, this.can.height / 4)
    this.ctx.fillText(this.scanDatamax, startx - maxmeasure - 5, 15)
  }
}
}

// non full blown classes
/**
 *Color collection is a tool to break the 3d color space of values 0-255,0-255,0-255 into rnum distict values that can be used to uniquely identify the region that a mouse click has occured within.
 *
 * @param {*} rnum Number of regions to generate color combinations for
 * @returns {}
 * 
 */
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

/**
 *Standard parametric interpolation. Provided x0 y0 and x1 y1, generate a formula for a line that lets  us calculate a y value for a certain x. Used for region coordinate space to canvas space, and div style to fill value  conversions.
 *
 * @returns {}
 */
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

/**
 *Generate an interpolator for colors between two specified colors (rgb).  
 *
 * @param {*} c1 a color object {r:num,g:num,b:num}
 * @param {*} c2 another color object {r:num,g:num,b:num}
 * @param {*} t numeric value 0 to 1 
 * @returns {}
 */
let LerpCol = (c1, c2, t) => {
  let red = Math.round(c1.r + (c2.r - c1.r) * t)
  if (red > 255) {
    red = 255
  }
  let blue = Math.round(c1.b + (c2.b - c1.b) * t)
  if (blue > 255) {
    blue = 255
  }
  let green = Math.round(c1.g + (c2.g - c1.g) * t)
  if (green > 255) {
    green = 255
  }
  return `rgb(${red},${green},${blue})`

}


let appHolder = document.querySelector("#applicationHolder")
if (document.querySelector("#sheet")) {
  document.querySelector("#sheet").remove()
}
let cleanSheet = document.createElement("div")
cleanSheet.id = "sheet"
appHolder.append(cleanSheet)
var app = new Application(cleanSheet, atlas, csvData, sessionData)

// provide loaders for session and csv data sources
var csvData, sessionData




app.runApp()