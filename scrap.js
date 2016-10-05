var cardMeaningsUrl = 'http://www.metasymbology.com/whatsyourcard.html';
var extractedData = [];
var fs = require('fs');

var casper = require('casper').create({
    pageSettings: {
        userAgent: 'Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.2 Safari/537.36'
    }
});

casper.saveJSON = function(what) {
    fs.write('result.json', JSON.stringify(what, null, '  '), 'w');
};

casper.start(cardMeaningsUrl).then(function() {
    extractedData = this.evaluate(function() {
        return [].slice.call(document.querySelectorAll('img[id^="card_"]')).map(function(item) {
            var out = {
                days: []
            };
            var cleanDomainUrl = window.location.origin;
            var data = item.getAttribute("title").trim().split(/\s*,\s*/);
            out["card_name"] = data.shift();
            out["image_path"] = cleanDomainUrl + item.getAttribute("src");
            out["description"] = cleanDomainUrl + item.parentNode.getAttribute("href");
            while (data.length != 0) {
                var currentDate = data.shift().trim().split("/");
                var month = parseInt(currentDate.shift(), 10);
                var day = parseInt(currentDate.shift(), 10);
                out["days"].push({
                    "month": month,
                    "day": day
                });
            }
            return out;
        });
    });
    // here we will save the images and extract descripions.
    extractedData = extractedData.map(function(item) {
        var imageName = (item.image_path.match(/[^\/.]+\.[a-z]{3}$/i) || [false])[0];
        var newPath = "images/" + imageName;
        this.download(item.image_path, newPath);
        item.image_path = newPath;
        this.thenOpen(item.description, function() {
            item.description = this.evaluate(function() {
                var out = [];
                [].slice.call(document.querySelectorAll(".grid-col > *")).every(function(textItem) {
                    // we will get things until BIRTHDAY:
                    if(textItem.textContent.indexOf("BIRTHDAY:") != -1) {
                        return false;    
                    } else if (textItem.textContent.replace(/\s+/g, "") != "") {
                        out.push(textItem.textContent.toString().trim());
                        return true;
                    }
                });
                return out;
            });
        });
        return item;
    }, casper);
});

casper.run(function() {
    this.saveJSON(extractedData);
    this.echo("All done! Check file result.json in the same directory.").exit();
});
