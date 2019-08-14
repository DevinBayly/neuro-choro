import geodata from "./gz_2010_us_040_00_500k.json"
import brain from "./GeoJson_Brains/sag_228_L_-24mm.json"

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
let drawLine = (linedata,ctx)=> {
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
    let first = linedata[0]
    let x = xinterp.calc(first[0])
    let y = yinterp.calc(first[1])

    ctx.moveTo(x,y)
    for (let i = 1; i < linedata.length;i++) {
      let pt = linedata[i]
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
    ctx.fillStyle=`rgb(${Math.floor(Math.random()*255)},${Math.floor(Math.random()*255)},${Math.floor(Math.random()*255)})`
    ctx.fill()
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
  let data_bound = line
  let line = drawLine(data_bound,drawing.ctx)
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
  debugger
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
console.log(geodata)
console.log(globals)
console.log(Math.floor(Math.random()*255))
let can = document.querySelector("canvas")
can.addEventListener("click",(e)=> {
  getPos(can,e)
})

