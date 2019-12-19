# Neuroimaging Choropleth Tool


## Introduction

[source citation]

Choropleths are simple maps that display regional changes as color (e.g., a US map showing states that lean Democrat vs Republican). Here is an example of a brain choropleth.

![](https://raw.githubusercontent.com/DevinBayly/neuro-choro/iodide/test.png)

We demonstrated that this simple approach to visualization works well for brains, and, in fact, facilitates analysis:

Patterson, D. K., Hicks, T., Dufilie, A. S., Grinstein, G., & Plante, E. (2015). Dynamic Data Visualization with Weave and Brain Choropleths. PLoS ONE, 10(9), e0139453–17. http://doi.org/10.1371/journal.pone.0139453

Obviously brain choropleths are most valueable if you can choose the slice to view and display information about the regions in each slice. The original dynamic Weave visualizations allowed slice stacking. However, you will need to enable Adobe Flash to view the Weave visualizations, and Weave is no longer available. For this reason, we needed a new implementation. See Devin Bayly’s Neuro-choropleths Iodide Notebook. This work was supported by the University of Arizona HPC center. It uses Javascript to display GeoJSON slices and regional information. It is very fast, but still a work in progress as of 11/18/2019.


[source citation]: https://neuroimaging-core-docs.readthedocs.io/en/latest/pages/choropleths.html

## Access

This tool is compatible with the [Iodide](https://alpha.iodide.io/) scientific computation notebook environment, and a live version of it is accessible here:
[Neuro-Choropleth Notebook](https://alpha.iodide.io/notebooks/3446/?viewMode=report)
