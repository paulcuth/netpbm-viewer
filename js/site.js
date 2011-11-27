(function () {	
	
	
	var Image = function (data) {
		
		var exp = /^(\S+)\s+(\#.*?\n)*\s*(\d+)\s+(\d+)\s+(\d+)?\s*/,
			match = data.match (exp);

		if (match) {
			var width = this.width = parseInt (match[3], 10),
				height = this.height = parseInt (match[4], 10),
				maxVal = parseInt (match[5], 10),
				bytes = (maxVal < 256)? 1 : 2,
				data = data.substr (match[0].length);

			switch (match[1]) {
				
				case 'P1':
					this._parser = new ASCIIParser (maxVal + ' ' + data, bytes);
					this._formatter = new PBMFormatter (width, height);
					break;

				case 'P2':
					this._parser = new ASCIIParser (data, bytes);
					this._formatter = new PGMFormatter (width, height, maxVal);
					break;

				case 'P3':
					this._parser = new ASCIIParser (data, bytes);
					this._formatter = new PPMFormatter (width, height, maxVal);
					break;

				case 'P4':
					this._parser = new BinaryParser (data, bytes);
					this._formatter = new PBMFormatter (width, height);
					break;

				case 'P5':
					this._parser = new BinaryParser (data, bytes);
					this._formatter = new PGMFormatter (width, height, maxVal);
					break;

				case 'P6':
					this._parser = new BinaryParser (data, bytes);
					this._formatter = new PPMFormatter (width, height, maxVal);
					break;
				
				default:
					throw new TypeError ('Sorry, your file format is not supported. [' + match[1] + ']');
					return false;
			}
			
		} else {			
			throw new TypeError ('Sorry, file does not appear to be a Netpbm file.');
			return false;
		}
	};
	
	
	Image.prototype.getPNG = function () {
		var canvas = this._formatter.getCanvas (this._parser);
		return Canvas2Image.saveAsPNG (canvas, true);
	};
	

	
	
	BinaryParser = function (data, bytes) {
		this._data = data;
		this._bytes = bytes;
		this._pointer = 0;
	};
	
	
	BinaryParser.prototype.getNextSample = function () {
		if (this._pointer >= this._data.length) return false;

		var val = 0;
		for (var i = 0; i < this._bytes; i++) {
			val = val * 255 + this._data.charCodeAt (this._pointer++);
		}

		return val;
	};
	

	
	
	ASCIIParser = function (data, bytes) {
		this._data = data.split (/\s+/);
		this._bytes = bytes;
		this._pointer = 0;
	};
	
	
	ASCIIParser.prototype.getNextSample = function () {
		if (this._pointer >= this._data.length) return false;
		
		var val = 0;
		for (var i = 0; i < this._bytes; i++) {
			val = val * 255 + parseInt (this._data[this._pointer++], 10);
		}

		return val;
	};
	
	
	
	PPMFormatter = function (width, height, maxVal) {
		this._width = width;
		this._height = height;
		this._maxVal = maxVal;
	};


	PPMFormatter.prototype.getCanvas = function (parser) {
		var canvas = document.createElement ('canvas'),
			ctx = canvas.getContext ('2d'),
			img;
			
		canvas.width = ctx.width = this._width;
		canvas.height = ctx.height = this._height;

		img = ctx.getImageData (0, 0, this._width, this._height);
		
		for (var row = 0; row < this._height; row++) {
			for (var col = 0; col < this._width; col++) {
				
				var factor = 255 / this._maxVal,
					r = factor * parser.getNextSample (),
					g = factor * parser.getNextSample (),
					b = factor * parser.getNextSample (),
					pos = (row * this._width + col) * 4;

				img.data[pos] = r;
				img.data[pos + 1] = g;
				img.data[pos + 2] = b;
				img.data[pos + 3] = 255;
			}	
		}

		ctx.putImageData (img, 0, 0);
		return canvas;
	};




	PGMFormatter = function (width, height, maxVal) {
		this._width = width;
		this._height = height;
		this._maxVal = maxVal;
	};


	PGMFormatter.prototype.getCanvas = function (parser) {
		var canvas = document.createElement ('canvas'),
			ctx = canvas.getContext ('2d'),
			img;
			
		canvas.width = ctx.width = this._width;
		canvas.height = ctx.height = this._height;

		img = ctx.getImageData (0, 0, this._width, this._height);
		
		for (var row = 0; row < this._height; row++) {
			for (var col = 0; col < this._width; col++) {
				
				var d = parser.getNextSample () * (255 / this._maxVal),
					pos = (row * this._width + col) * 4;

				img.data[pos] = d;
				img.data[pos + 1] = d;
				img.data[pos + 2] = d;
				img.data[pos + 3] = 255;
			}	
		}

		ctx.putImageData (img, 0, 0);
		return canvas;
	};

	


	PBMFormatter = function (width, height) {
		this._width = width;
		this._height = height;
	};


	PBMFormatter.prototype.getCanvas = function (parser) {
		var canvas = document.createElement ('canvas'),
			ctx = canvas.getContext ('2d'),
			img;
		
		if (parser instanceof BinaryParser) {
			var data = '',
				byte,
				bytesPerLine = Math.ceil (this._width / 8);

			for (var i = 0; i < this._height; i++) {
				var line = parser._data.substr (i * bytesPerLine, bytesPerLine),
					lineData = '';

				for (var j = 0; j < line.length; j++) lineData += ('0000000' + line.charCodeAt (j).toString (2)).substr (-8);
				data += lineData.substr (0, this._width);
			}
								
			while ((byte = (parser.getNextSample ())) !== false) {
				data += ('0000000' + byte.toString (2)).substr (-8);
			}

			parser = new ASCIIParser (data.split ('').join (' '), 1);
		}
		
		canvas.width = ctx.width = this._width;
		canvas.height = ctx.height = this._height;

		img = ctx.getImageData (0, 0, this._width, this._height);

		for (var row = 0; row < this._height; row++) {
			for (var col = 0; col < this._width; col++) {
				
				var d = (1 - parser.getNextSample ()) * 255,
					pos = (row * this._width + col) * 4;
				img.data[pos] = d;
				img.data[pos + 1] = d;
				img.data[pos + 2] = d;
				img.data[pos + 3] = 255;
			}	
		}

		ctx.putImageData (img, 0, 0);
		return canvas;
	};

	


	


	
	var landingZone = document.getElementById ('landing-zone'),
		imageList = document.getElementById ('image-list'),
		holder = document.getElementById ('holder');
	

	landingZone.ondragover = function (e) {
		e.preventDefault ();
		return false;	
	};

	
	landingZone.ondrop = function (e) {
		e.preventDefault ();
		
		var outstanding = 0,
			checkOutstanding = function () {
				if (!outstanding) $(landingZone).removeClass ('busy');
			};
			
		$(landingZone).addClass ('busy');
		
		
		for (var i = 0, l = e.dataTransfer.files.length; i < l; i++) {
			outstanding++;
			
			var file = e.dataTransfer.files[i],
				reader = new FileReader();
	
			reader.onload = function (event) {
				var data = event.target.result,
					img;
					
				try {
					img = new Image (data);
					addImage (img);

				} catch (e) {
					alert (e.message);
				}
			
				outstanding--;
				checkOutstanding ();
			};
		
			reader.readAsBinaryString (file);
		}
				
		return false;
	};




	function addImage (img) {
		
		var height = img.height,
			width = img.width,
			png = img.getPNG ();

		$(png).height (0).css ({
			left: '-25px'
		}).animate ({
			top: (-height / 2) + 'px',
			left: '25px',
			height: height + 'px'
		}); 
		
		var $li = $('<li>').append (png).prependTo (imageList);

		var holderHeight = height + 50;
		if ($(holder).height () < holderHeight) $(holder).animate ({ height: holderHeight + 'px' });

		var listWidth = $(imageList).width () + width + 25;
		$(imageList).width (listWidth);

		$('<span>').css ({paddingLeft:0}).appendTo ($li).animate ({ paddingLeft: width + 'px' });
	}

	
})();