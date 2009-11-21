function PhotoChop(gamePanelSelector, imageArray, options) {
	var $game = $(gamePanelSelector),
		$table = null,
		$rows = null,
		total = {
			rows : 0,
			cols : 0
		},
		opts = {
			blockWidth : 50,
			blockHeight : 40,
			cellIdPrefix : 'cell-',
			cellBgColor : '#ccc',
			hoverClass : 'hover',
			dragTargetClass : 'dragTarget',
			dropTargetClass : 'dropTarget'
		},
		imgArr = imageArray,
		img = new Image(),
		dragEnabled = false,
		dropCell = {
			row : 0,
			col : 0
		},
		dragTarget = null,
		cellStatus = {
			correct : 0,
			total : 0
		},
		highlightDivs = new Array(),
		paused = false;

// Pre image load initialization
	function init() {
		$table = $('<table border="0" cellspacing="0" cellpadding="0"></table>')
		img.src = imgArr[0];
	}
	
// Pist image load initialization
	function imageLoaded() {
		$('td', $table).mouseover(cellMouseover)
					   .mouseout(cellMouseout)
					   .mousedown(cellMousedown);
		$(window).mousemove(windowMousemove)
				 .mouseup(windowMouseup);
				 
		cellStatus = getCellOrder();
		paused = false;
		$(window).trigger('newImageLoaded');
	}
	
// Fill the table with cells and apply the background image to each cell
	$(img).load(function(){
		var rows = Math.ceil(this.height / parseFloat(opts.blockHeight)),
			cols = Math.ceil(this.width / parseFloat(opts.blockWidth));
		
		for (var i = 0; i < rows; i++) {
			var newRow = $('<tr></tr>');
			
			for (var j = 0; j < cols; j++) {
				var newCol = $('<td></td>'),
					bg = '';
				
				bg = opts.cellBgColor + ' url(' + img.src + ') ' 
						+ (0 - (j * opts.blockWidth)) + 'px ' // left
						+ (0 - (i * opts.blockHeight)) + 'px ' // top
						+ 'no-repeat';
				
				newCol.attr('id', opts.cellIdPrefix + (i * cols + j))
					  .css({
						'width' : opts.blockWidth + 'px',
						'height' : opts.blockHeight + 'px',
						'background' : bg
					  })
					  	
				newRow.append(newCol)
			} // end for j
			
			$table.append(newRow);
		} // end for i
		
		$game.prepend($table);
		total.rows = rows;
		total.cols = cols;
		
		$rows = $('tr', $table.get(0));
		
		// Continue with processing after image loaded
		imageLoaded();
	});
	
	function cellMouseover() {
		if (!paused)
			$(this).addClass(opts.hoverClass);
	}
	
	function cellMouseout() {
		$(this).removeClass(opts.hoverClass);
	}
	
	function cellMousedown(e) {
		if (!paused) {
			var t = $(this);
			
			dragEnabled = true;
			dragTarget = $('<div></div>').append(t.html())
										 .addClass(opts.dragTargetClass)
										 .css({
										 	'position' : 'absolute',
										 	'top' : e.pageY - (opts.blockHeight / 2) + 'px',
										 	'left' : e.pageX - (opts.blockWidth / 2) + 'px',
										 	'width' : t.css('width'),
										 	'height' : t.css('height'),
										 	'background' : t.css('background'),
										 	'background-position' : t.css('background-position')
										 });
	
			$(document.body).disableTextSelect()
					 .append(dragTarget);
			
			t.addClass(opts.dropTargetClass);
			$('td', $table).removeClass(opts.hoverClass)
			dropCell.row = $rows.index(t.parent());
			dropCell.col = $('td', t.parent()).index(this);
			t.css('background', '#fec');
		}
	}
	
	function windowMousemove(e) {
		if (dragEnabled) {
			dragTarget.css({
				'top' : e.pageY - (opts.blockHeight / 2) + 'px',
			 	'left' : e.pageX - (opts.blockWidth / 2) + 'px'
			});
			
			if (e.pageY > bottom_y(dropCell, e) && dropCell.row < total.rows - 1) {
				var newDropCell = { row: 1 + dropCell.row, col: dropCell.col }
				swapCells( dropCell, newDropCell);
				dropCell = newDropCell;
			} else if (e.pageY < top_y(dropCell) && dropCell.row > 0) {
				var newDropCell = { row: dropCell.row - 1, col: dropCell.col }
				swapCells( dropCell, newDropCell);
				dropCell = newDropCell;
			}
			
			if (e.pageX > right_x(dropCell) && dropCell.col < total.cols - 1) {
				var newDropCell = { row: dropCell.row, col: 1 + dropCell.col }
				swapCells( dropCell, newDropCell);
				dropCell = newDropCell;
			} else if (e.pageX < left_x(dropCell) && dropCell.col > 0) {
				var newDropCell = { row: dropCell.row, col: dropCell.col - 1 }
				swapCells( dropCell, newDropCell);
				dropCell = newDropCell;
			}
		}
	}

	function windowMouseup() {
		if (dragEnabled) {
			$getCellObj(dropCell).css('background', dragTarget.css('background'));
			$getCellObj(dropCell).css('background-position', dragTarget.css('background-position'));
			dragTarget.remove();
			$(document.body).enableTextSelect();
			
			cellStatus = getCellOrder();
			if (cellStatus.correct == cellStatus.total) {
				$(window).trigger('puzzleSolved');
			}
			
			dragEnabled = false;
			$(window).trigger('dragEnded');
		}
	}
	
	function bottom_y(cell, e) {
		cell = $getCellObj(cell);
		if ($.browser.safari) // safari doesn't like empty table cells
			// it incorrectly reports the center of the table cell as its top
			return cell.offset().top + cell.outerHeight() - (opts.blockHeight / 2);
		return cell.offset().top + cell.outerHeight();
	}
	
	function top_y(cell) {
		cell = $getCellObj(cell);
		if ($.browser.safari) // safari doesn't like empty table cells
			// it incorrectly reports the center of the table cell as its top
			return cell.offset().top - (opts.blockHeight / 2);
		return cell.offset().top;
	}
	
	function right_x(cell) {
		cell = $getCellObj(cell);
		return cell.offset().left + cell.outerWidth();
	}
	
	function left_x(cell) {
		cell = $getCellObj(cell);
		return cell.offset().left;
	}
	
// Returns { correct: inorder, total: count };
	function getCellOrder() {
		var count = 0,
			inorder = 0;
			
		$rows.each(function(){
			$('td', this).each(function(){
				var id = $(this).attr('id');
				if (parseInt(id.substr(opts.cellIdPrefix.length)) == count++)
					inorder++;
			});
		});
		
		return { correct: inorder, total: count };
	}
	
	
// Get a jQuery object that references the given cell
// cell = { row: 0, col: 0 }
	function $getCellObj(cell) {
		return $($('td', $rows.get(cell.row)).get(cell.col));
	}
	
// Compute a random number in the range [0,max)
	function rand(max) {
		return Math.floor(Math.random() * max);
	}
	
// Swap the ids, contents, and backgrounds of two cells
//  c1, c2 = { row: 0, col: 0 }
	function swapCells(c1, c2) {
		var $c1 = $getCellObj(c1),
			$c2 = $getCellObj(c2),
			temp = $c1.html(),
			tempId = $c1.attr('id'),
			tempBg = $c1.css('background');
			tempBgp = $c1.css('background-position');
		
		$c1.html($c2.html());
		$c1.attr('id', $c2.attr('id'));
		$c1.css('background', $c2.css('background'));
		$c1.css('background-position', $c2.css('background-position'));
		$c2.html(temp);
		$c2.attr('id', tempId);
		$c2.css('background', tempBg);
		$c2.css('background-position', tempBgp);
		
		$c1.removeClass(opts.dropTargetClass);
		$c2.addClass(opts.dropTargetClass);
		
		$(window).trigger('cellsSwapped');
	}
	
// All of the highlighting functions	
	function createHighlightDiv(color, offsetEl) {
		var div = $('<div></div>').css({
			'width' : opts.blockWidth + 'px',
			'height' : opts.blockHeight + 'px',
			'background' : color,
			'opacity' : 0.0
		});
		
		$(offsetEl).append(div);
	}
	
var highlightsVisible = false,
	isHighlighting = false;

	function clearHighlights() {
		$('td div', $table).fadeOut(function(){
			$(this).remove();
			isHighlighting = false;
		});
		highlightsVisible = false;
		$(window).unbind('mouseup', clearHighlights);
	}
	
	function clearHighlightsNow() {
		$('td div', $table).hide().remove();
		highlightsVisible = false;
		$(window).unbind('mouseup', clearHighlights);
	}
	
	this.highlight = function() {
		var count = 0, 
			id;
		
		if (isHighlighting)
			return;
		else
			isHighlighting = true;
			
		if (highlightsVisible)
			clearHighlightsNow();
		
		$rows.each(function(){
			$('td', this).each(function(){
				id = $(this).attr('id');
				if (parseInt(id.substr(opts.cellIdPrefix.length)) != count++)
					createHighlightDiv('red', this);
				else
					createHighlightDiv('green', this);
			});
		});
		$('td div', $table).fadeTo('normal', 0.4);
		highlightsVisible = true;
		$(document.body).bind('mouseup', clearHighlights);
	}
	
// Randomly arranges the cells in the table
	this.scramble = function() {
		var r = total.rows, 
			c = total.cols,
			c1, c2;

		for (var i = 0; i < total.rows * total.cols; i++) {
			c1 = { row: rand(total.rows), col: rand(total.cols)};
			c2 = { row: rand(total.rows), col: rand(total.cols)};
			swapCells(c1, c2);
		}
		
		cellStatus = getCellOrder();
		$(window).trigger('newGameStarted');
	}
	
	this.totalCells = function() {
		return total.rows * total.cols;
	}
	
	this.correct = function() {
		return cellStatus.correct;
	}

// photo preview
	var preview = $('<div/>'),
		isPeeking = false;
	this.peek = function() {
		if (isPeeking)
			return;
		else
			isPeeking = true;
		
		preview.css({
			'position' : 'absolute',
			'top' : $table.offset().top - 5 + 'px',
			'left' : $table.offset().left - 5+ 'px',
			'width' : img.width + 'px',
			'height' : img.height + 'px',
			'background' : 'url(' + img.src + ') 0 0 no-repeat',
			'display' : 'none',
			'border' : '5px solid #000'
		});
		$(document.body).append(preview);
		preview.fadeIn('fast');
		$(window).bind('mouseup', unpeek);
		$table.fadeTo('normal', 0.01);
	}
	
	function unpeek() {
		preview.fadeOut(function(){
			preview.remove();
			isPeeking = false;
		});
		$(window).unbind('mouseup', unpeek);
		$table.fadeTo('normal', 1.0);
	}

// pause/resume
	this.pause = function() {
		paused = true;
	}
	
	this.resume = function() {
		paused = false;
	}

// new game

	this.newGame = function(url) {
		imgArr[0] = url;
		$table.remove();
		init();
	}
	
////////////////////////////////////////////////////////////////////////////////////////////////////	
// DO NOT EDIT BELOW THIS LINE! ////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////

	init();
}

// Initialize the game
$(function(){
	var pc = new PhotoChop('#gamePanel', ['campsite.jpg'], null),
		elapsedTime = 0,
		timer = null,
		paused = false,
		running = false;
	
	// game controls
	$('#scramble').click(pc.scramble);
	
	$('#highlight').mousedown(function(){
		if (!paused)
			pc.highlight();
	});
	$('#peek').mousedown(function(){
		if (!paused)
			pc.peek()
	});
	
	$('#pause').click(function(){
		if (running && paused) {
			timer = setInterval(function(){
				$('#time').html(formatTime(++elapsedTime));
			}, 1000);
			$('#gamePanel table').fadeTo('normal', 1.0);
			$('#pause').attr('value', 'Pause');
			pc.resume();
			paused = false;
		} else if (running) {
			clearTimeout(timer);
			$('#pause').attr('value', 'Resume');
			$('#gamePanel table').fadeTo('normal', 0.1);
			pc.pause();
			paused = true;
		}
	});

// get new image from the internet	
	$('#load').click(function(){
		pc.newGame($('#url').attr('value'));
	});

// new image
	$(window).bind('newImageLoaded', function() {
		$('#score').html(pc.correct() + ' / ' + pc.totalCells());
		$('#time').html('00:00');
	});

// new game
	$(window).bind('newGameStarted', function() {
		$('#score').html(pc.correct() + ' / ' + pc.totalCells());
		$('#time').html('00:00');
		timer = resetTimer(timer);
		running = true;
		paused = false;
		$('#pause').attr('value', 'Pause');
		$('#win').html('')
	});
	
	$(window).bind('cellsSwapped', function() {
		// do nothing
	});

	$(window).bind('dragEnded', function() {
		$('#score').html(pc.correct() + ' / ' + pc.totalCells());
	});
	
// game over
	$(window).bind('puzzleSolved', function() {
		$('#score').html(pc.correct() + ' / ' + pc.totalCells());
		clearTimeout(timer);
		$('#win').html('Puzzle complete!').css({
			'font-weight' : 'bold',
			'color' : '#060'
		});
	});

// timer functions	
	function resetTimer(timer) {
		if (timer != null)
			clearTimeout(timer);
		
		elapsedTime = 0;
		
		return setInterval(function(){
			$('#time').html(formatTime(++elapsedTime));
		}, 1000);
	}
	
	function formatTime(seconds) {
		var mins = seconds / 60,
			secs = seconds % 60;
		return pad(mins) + ':' + pad(secs);
	}
	
	function pad(num) {
		if (num < 10)
			return '0' + parseInt(num);
		else
			return parseInt(num);
	}
});
