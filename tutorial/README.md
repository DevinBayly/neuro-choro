# Neuroimaging Choropleth Tool Tutorial

This tool is meant to assist with efficient initial, or subsequent exploration of fMRI results processed with the roixtractor tool created by Dianne Patterson. 

## Documentation terms defined

**Choropleth**: This is a term for a presentation of data ontop of a map who's regions are geographic, taken from a brain atlas, or some other origin.

**Pane** : This is the section of the page holding all the options for manipulating and viewing the neuro choropleth. Add pane creates more of these, export saves all visible panes to a JSON session file, and import loads a JSON session file so that the previous session's panes are visible and available for interaction. 

**Region Color Column** : Refers to the column of the CSV data uploaded that the user would like to use as the fill color of the brain regions in the choropleth.

**Brain Views** : These radio buttons give the option to view the brain regions from one of the 3 classical perspectives that researchers look at the brain (axial,sagittal,coronal).

**Fill Color Filter** : This slider helps select what regions are colored for any given slice on the canvas. Dragging the min/max slider to the right/left respectively excludes values of the **Region Color Column** from inclusion in region fill color calculation and filling on canvas.

**Alt Column Filter** : This option allows users to create filter rules that apply to columns that aren't the **Region Color Column**. For instance, a user can create a rule on the "Lobe" column that regions should only get fill values if they belong to a row with a "Lobe" value of "== R" or perhaps "!= L". Categorical variable columns have the "==" or "!=" operators, and Numerical variable columns have the ">" or "<" operations. As many or as few of these rules can be created as the user is interested in.



## Options for use

* First steps
    * Navigate to the temporary home of the neuro-choropleth tool :[https://us-central1-neuro-choro.cloudfunctions.net/app/start](https://us-central1-neuro-choro.cloudfunctions.net/app/start)
    * Scroll down till you see a **Pane** 
    * Click **Upload a CSV**, and select one of the files created with the roixtractor
    * Now click on the drop down to the right of **Region Color Column**
    * Select one of the columns that has numerical data
    * Select one of the **Brain Views** that you are interested in
    * Click and drag the slider next to the words **Slice Selector** to move through the different brain slices available for a region 
* Modifying your fills
    * Drag the sliders under the **Fill Color Filter** to adjust the lower and upper limits on what data is included from the **Region Color Column** to actually fill your regions
    * Create an **Alt Column Filter** applied to one of the columns that isn't the active **Region Color Column**, or remove these filters with the "X" icon at the far left of the row
    * Click within the canvas on a filled region to create a tooltip for that region displaying pertinent information about the slice displayed and the filter constraints on region color data its using for fills, or click once more on a region to eliminate the tooltip for that region
    * Type notes into the textarea at the bottom of the pane 
* Adding additional panes
    * Click the **Add Pane** button above the visible panes and repeat the CSV loading process to work with multiple views and multiple CSV's at the same time
* Removing a Pane
    * Click the large "X" in the top left of the pane to remove the pane from the visible panes
* Exporting a session
    * Ensure that all the panes loaded have CSV data for them, or remove them with the "X" icon
    * Click on the **Export Session** button to the right of the **Add Pane** button above the visible panes
    * Click "save" in the pop out window provided
    * Sessions are named according to the timestamp information at time of export
* Importing a session
    * Click the **Import Session** button to the right of the **Export Session** button above the visible panes 


## Where are my plots AKA how do I get data from my filtered session?

If you would like to make line/bar plots with the values of from your exploratory session, click the **Download Plot Data** Button to the right of the **Import Session** button. This downloads a csv where the rows are all region names and each column is the **Region Color Column** post session filtration/modification. The goal here is to not tie the choropleth tool tightly to a single plotting service, but to allow you the researcher to use what you are the most comfortable with.