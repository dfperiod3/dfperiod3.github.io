# wildlandsoptimizer

## Intro
Optimizes Dwarven Forge Wildlands pledges

It will probably work best on a laptop or computer, rather than a mobile device or tablet, as it runs locally in your browser and has to do some 
crunchy computation.

I use it for "subtractive" pledge building, where you start with more and then eliminate or reduce the quantity of certain items you decide you can live without, and then use the program to identify which packs you need to buy to achieve the reduced 
configuration.

Example problems it can help with:

- I want N of every sculpt.  What's the least expensive combination of packs to achieve this?
- I want wildlands untamed, but I'm willing to paint this, this, and this; whereas I want this, this and this pre-painted.  
What's the least expensive combination of packs?
- I have certain encounters/layouts in mind.  I want to be able to build any of them, just not all at the same time.  What's the least expensive
combination of packs?

## Kudos:
- Randy, whose spreadsheet powers the thing.
- The guy who wrote the linear program solver library I use

## How do I use this thing?

1.  Navigate to Randy's spreadsheet (see FAQ for link)
2.  Select the 'Details' tab.
3.  Click File->Download->Comma separated values
4.  Navigate to the app at https://dfperiod3.github.io/
5.  Click 'Browse' and select the .csv file you just downloaded

The display has three panes: the left pane is where you make your desired item selections.  The right pane is a convenience, and offers all the packs offered in the Wildlands KS.  You can click 'Add' beside any of these packs to update the desired item list (left pane) with the items comprising the pack.  If the 'Sum' button is selected, the pack's contents are ADDED to the existing quantities of items in the desired item list.  If 'Max' is selected, then the desired quantity of each item in the left pane is set to Max(a,b) where a is the current desired quantity of the item, and b is the number of that item in the selected pack.  

The left pane additionally has some short cut buttons that set the desired quantities for 1 of every painted or unpainted sculpt, excluding surface textures, trays, foggers, or anything that isn't a sculpt.

When you're ready, click 'Optimize'.  Most of the time this will take less than a few seconds.  However, in some cases it can take several minutes and your browser may complain about the script being unresponsive.  Give it some time.

Once it finds the optimal packs, they will be listed in a third pane across the bottom.

## FAQ
**My browser hung!**

It probably didn't.  Some configurations (e.g. 1 of each pack) are just harder to solve and could take several minutes.  However, most configurations are very fast (<1s)

**Do the prices include shipping?**

No.

**What version of Randy's spreadsheet do I use?**

I used this one https://docs.google.com/spreadsheets/d/1RwR0uuu4ei2bNVJ__59HXnwZbXncjYEX/edit#gid=2070237370 dated 2020-10-24


