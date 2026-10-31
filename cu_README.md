# Cities-Untold Pledge Optimizer

## Intro
This tool helps you figure out your optimal pledge.   Enter in the items you want on the left, click optimize, and it will tell you which sets to buy 
to achieve at least those items at minimal cost.  

This and other features allow the optimizer to solve other problems including:

- I want a bunch of districts and landmarks, but there are some items I'm willing to paint and some I'm not. What's the least expensive 
combination of packs?
- I have certain encounters/layouts in mind.  I want to be able to build any of them, just not all at the same time.  What's the least 
expensive combination of packs?

The algorithm always finds the combination of sets that gives at least the items entered.  This means it may at times 
add on an entire expensive set just to get one item.  

## Kudos:
- Dwarven Forge, for making this stuff
- "Randy", whose spreadsheet powers this thing.
- The guy who wrote the integer linear program solver library that I use (https://github.com/JWally/jsLPSolver)

## How do I use this?

### Input
To work, the program needs to know what packs exist, their composition, and their price.  It gets this information from the 'Details' tab 
of Randy's spreadsheet. Generally, you'll want to click the 'Use Version...' link.  But, if you prefer, you can use the 'Browse' button to upload a .CSV export of this 'Details' tab yourself.  The 
ONLY information considered is pack composition and price from this 'Details' tab of the spreadsheet.  

### User Interface
The display has three panes: the left pane is where you make your desired item selections.   The right pane is a convenience, and offers 
all the packs offered in the CULT KS.  You can click 'Add' beside any of these packs to update the desired item list (left pane) 
with the items comprising the pack.  If the 'Sum' button is selected, the pack's contents are ADDED to the existing quantities of items
in the desired item list.  If 'Max' is selected, then for each item in the corresponding pack, the desired quantity of that item will be set 
to at least that quantity.   Most of the time, you'll want "sum", but if you're trying to see how to build one thing or another thing, but not at the same time, choose max.  

Each pack also has an 'Omit' checkbox.  If this is clicked, it means the pack will NOT be considered in the optimization.  
You can still add the contents of the pack to your desired item list, but the pack itself will never be selected as part of the optimal
solution.  This can be helpful to force-exclude larger packs to see how they might be decomposed into smaller packs.
(This is probably less useful for CULT, but the feature remains as a holdover from the wildlands pledge optimizer)

The left pane additionally has some short cut buttons that set the desired quantities for 1 of every painted or unpainted sculpt, 
excluding trays, battle boards, or anything that isn't a sculpt.

When you're ready, click 'Optimize'.  Most of the time this will take less than a few seconds.  However, in some cases it can take a
minute or two and your browser may complain about the script being unresponsive.  Give it some time.  In other cases, it just might not 
work. Sorry!

Once it finds the optimal packs, they will be listed in a third pane across the bottom.  There will be a link to the item manifest, 
where you can see all the items that make up the optimal pledge.  Within the item manifest, there is also a toggle link that allows you
to only show those items which were NOT requested.  These are all the "spillover" items / extras / leftovers that were part of the 
optimal pack selection, but which you didn't request in the left pane.

### Example - I want to build dockside district or warfield village, but not at the same time.
1. Click 'Use Version...' link to load the Details tab in Randy's spreadsheet
2. In the right pane, click the 'max' radio button.  This ensures that we are not adding the contents of each district we select.  Instead, for each piece, we want the max(A,B), where A is the quantity of the item in the first district, and B is the quantity of the item in the second district.
3. Click 'Add' beside the Dockside district.  This will add all items comprising the dockside district to our desired item list.
4. Click 'Add' beside the Warfield Village district.  This will add all the items comprising Warfield village that aren't in Dockside to our desired item list.  It will also "bump up" the quantity of any items present in both districts, if the existing quantity is insufficient for Warfield village.
5. Click 'Optimize'.
6. Wait a few hundred milliseconds, then see the optimal pledge in the bottom pane. 


## FAQ
**My browser hung!**

It probably didn't.  Some configurations (e.g. 1 of each item) are just harder to solve and could take several minutes.  For example, 
calculating the optimal packs to buy to get 1 of every sculpt takes about 5 hours to solve, WITHOUT discount support (see below).

However, many configurations are very fast. 

**Do the prices include shipping?**
No.

**What's with the discounts support**
Discounts are supported if you click the checkbox.  If the checkbox is NOT checked, then the algorithm is unaware of the double-district, triple-district, and double-landmark discounts.  If its checked, it is aware and will consider these discounts in its search.  However, this can drastically slow performance, in some cases resulting in a 2-minute problem becoming a 2 hour problem.  For that reason, I've made it optional.




