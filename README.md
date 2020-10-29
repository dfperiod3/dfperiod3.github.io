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
You can either upload an export of Randy's latest spreadsheet, or just click the link at the top to use the most recent version.  If you choose to upload the export yourself, here are the steps:

1.  Navigate to Randy's spreadsheet (see FAQ for link)
2.  Select the 'Details' tab.
3.  Click File->Download->Comma separated values
4.  Navigate to the app at https://dfperiod3.github.io/
5.  Click 'Browse' and select the .csv file you just downloaded

Otherwise, just click the link.  (The link may not be updated as frequently as Randy's spreadsheet).

The display has three panes: the left pane is where you make your desired item selections.  The right pane is a convenience, and offers all the packs offered in the Wildlands KS.  You can click 'Add' beside any of these packs to update the desired item list (left pane) with the items comprising the pack.  If the 'Sum' button is selected, the pack's contents are ADDED to the existing quantities of items in the desired item list.  If 'Max' is selected, then the desired quantity of each item in the left pane is set to Max(a,b) where a is the current desired quantity of the item, and b is the number of that item in the selected pack.  

The left pane additionally has some short cut buttons that set the desired quantities for 1 of every painted or unpainted sculpt, excluding surface textures, trays, foggers, or anything that isn't a sculpt.

When you're ready, click 'Optimize'.  Most of the time this will take less than a few seconds.  However, in some cases it can take several minutes and your browser may complain about the script being unresponsive.  Give it some time.

Once it finds the optimal packs, they will be listed in a third pane across the bottom.

### Interpreting "% Lost if Omitted" and "Desired items lost if omitted"
Consider a desired item list consisting of the full contents of a majestic waterfalls pack, plus 1 extra cascading waterfall (for a total of 2),
plus one balefire lantern.

The optimal pledge will choose a majestic waterfalls pack, and then it will select *another* majestic waterfalls pack because it's the 
only way to get another cascading waterfall.  Then it will select an entire spooky swamp pack because it's the cheapest way to get a 
balefire lantern.


In the output below, you will see:

| Qty |	Item |	Cost |	% Lost if Omitted	| Desired items lost if omitted |
|:----|:----:|:-----:|:------------------:|------------------------------:| 
| 2 |	Majestic Waterfalls - Unpainted |	$110 |	14 |	-1 Cascading Waterfall - Unpainted |
| 1 |	Spooky Swamp - Painted |	$38 |	6 |	-1 Balefire Lantern (LED) - Painted |



%Lost if omitted is the number of DESIRED items lost if ONE of the corresponding packs was dropped, relative to the total number of items in 
the pack.   In the above example, if we drop one of the majestic waterfalls, we lose a whole bunch of stuff, but everything is still at
or equal to our desired quantities except the cascading waterfall, which is under the desired amount by 1.  Therefore the fraction is computed as
(2-1)/(# items in waterfall pack).

A low % Lost if Omitted suggests that a pack isn't contributing much to your desired set list, and is giving lots of extra pieces that are
either not in your list, or are over and above the quantity you want.

The 'Desired items lost if omitted' shows you which items from your desired list would be lost if ONE of the corresponding pack was
dropped.  Once again, this only counts if the item count would drop below your desired quantity.  In the above, dropping the waterfall 
means we lose a bunch of stuff, but only the cascading waterfall is reduced below our desired quantity.   This column roughly shows 
what this pack is contributing to your pledge.  Few items in this column means that at least one of the corresponding pack isn't contributing much to your desired items, and/or giving you a lot of extras.

## FAQ
**My browser hung!**

It probably didn't.  Some configurations (e.g. 1 of each item) are just harder to solve and could take several minutes.  However, most configurations are very fast (< 1s)

**Do the prices include shipping?**

No.

**What version of Randy's spreadsheet do I use?**

I used this one https://docs.google.com/spreadsheets/d/1RwR0uuu4ei2bNVJ__59HXnwZbXncjYEX/edit#gid=2070237370 dated 2020-10-24

