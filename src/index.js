import geodata from "./gz_2010_us_040_00_500k.json"
import brain from "./GeoJson_Brains/sag_228_L_-24mm.json"
import csvData from "./WeaveTutorial/Tables/indiv_run_summary_pos_thresh_ice_perc_sum.csv"

let interpolator = () => {
  let ob = {}
  ob.setup = (x0,y0,x1,y1) => {
    ob.x0 = x0
    ob.y0 = y0
    ob.x1 = x1
    ob.y1 = y1
  }
  ob.calc = (x) => {
    return (ob.y1-ob.y0)/(ob.x1 -ob.x0)*x + (ob.x1*ob.y0 - ob.y1 * ob.x0)/(ob.x1 - ob.x0)
  }
  return ob
}

let globals =[41,15,392,298]
let LerpCol = (c1,c2,t) => {
  let red = c1.r + ( c2.r - c1.r) *t
  let blue = c1.b + ( c2.b - c1.b) *t
  let green = c1.g + ( c2.g - c1.g) *t
  return `rgb(${red},${green},${blue})`

}
let drawLine = (linedata,ctx)=> {
  //linedata  = {points,region}
  let ob = {}
  // need canvas ref
  //create interpolator
  //map xmin - xmax to 0 to 5000 or whatever width is do the same for y
  let xinterp = interpolator()
  xinterp.setup(globals[0],0,globals[2],500)
  let yinterp = interpolator()
  yinterp.setup(globals[1],500,globals[3],0)
  ob.draw =() => {
    ctx.beginPath()
    let red = {
      r:255,
      g:0,
      b:0,
    }
    let yellow = {
      r:255,
      g:236,
      b:0
    }
    let first = linedata.points[0]
    let x = xinterp.calc(first[0])
    let y = yinterp.calc(first[1])

    ctx.moveTo(x,y)
    for (let i = 1; i < linedata.points.length;i++) {
      let pt = linedata.points[i]
      let x = xinterp.calc(pt[0])
      let y = yinterp.calc(pt[1])
      ctx.lineTo(x,y)
      // update the data
      if (pt[0] < globals[0]) {
        globals[0] = pt[0]
      }
      if( pt[1] < globals[1] ){
        globals[1] = pt[1]
      }
      if (pt[0] > globals[2]) {
        globals[2] = pt[0]
      }
      if( pt[1] > globals[3]) {
        globals[3] = pt[1]
      }
    }
    ctx.closePath()
    ctx.stroke()
    for (let row of csvData) {
      // the important parts of the dataset are in column 0 and column 9
      if ( linedata.region == row[0] ) {
        // the min appears to be almost 0 and the max should come in around 0.006
        let scanData = parseFloat(row[9])
        if (! isNaN(scanData)) {
          let  t = scanData/0.006 
          console.log(t)
          let lerpc = LerpCol(yellow,red,t)
          ctx.fillStyle=lerpc
          ctx.fill()
        }
        break
      }
    }
  }
  return ob
}

let setup = (lwidth) => {
  let ob = {}
  ob.begin = (height,width) => {
    let can = document.createElement("canvas")
    document.body.append(can)
    ob.can = can
    can.height = height
    can.width = width
    ob.ctx = can.getContext("2d")
    ob.ctx.lineWidth= lwidth
  }
  return ob
}

let dataBind = (drawing,data_to_bind) => {
  // drawing has can and ctx attributes
  // find a way get to the data we need here
  let iter = 0  
  console.log("number of total coordinates ",data_to_bind.geometry.coordinates.length)
  for (line of data_to_bind.geometry.coordinates) {
    //let data_bound = {coords:line,properties
    //make copy of line data and bind in the region name
    let drawingData = {
      points:line,
      region:data_to_bind.properties.regionName
    }
    console.log(data_to_bind.properties)
    let line = drawLine(drawingData,drawing.ctx)
    line.draw()
    iter +=1
  }
}

let featurePass = (drawing,upperData) => {
  let ob = {}
  ob.mapFeatures = () => {
    console.log("total features ",upperData.features.length)
  for (let feature of upperData.features) {
    let db = dataBind(drawing,feature)
  }
  }
  return ob
}


// lifted from stack overflow

let getPos = (can,e) => {
  let rect = can.getBoundingClientRect()
  let x = e.clientX - rect.left
  let y = e.clientY - rect.top
  console.log("x: ",x, "y: ", y)
}


//for each state have something which goes through the 
//  coordinates is an array of 
//
// aim for as much functional as possible



let drawing = setup(3)
console.log(brain)
drawing.begin(500,500)
let allfeatures = featurePass(drawing,brain)
allfeatures.mapFeatures()
console.log(globals)
console.log(Math.floor(Math.random()*255))
let can = document.querySelector("canvas")
can.addEventListener("click",(e)=> {
  getPos(can,e)
})
console.log(csvData)
let accessdata = csvData
