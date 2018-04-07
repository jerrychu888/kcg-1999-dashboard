var API_URL = 'http://proxy.g0v.ronny.tw/proxy.php?url=https://solhistory.kcg.gov.tw/his-open1999/api/case';

var works = {};
var works_time = {};
var works_district = [];
var charts = [];
var map;
var districts = ["楠梓區", "左營區", "鼓山區", "三民區", "鹽埕區", "前金區", "新興區", "苓雅區", "前鎮區", "旗津區", "小港區", "鳳山區", "大寮區", "鳥松區", "林園區", "仁武區", "大樹區", "大社區", "岡山區", "路竹區", "橋頭區", "梓官區", "彌陀區", "永安區", "燕巢區", "田寮區", "阿蓮區", "茄萣區", "湖內區", "旗山區", "美濃區", "內門區", "杉林區", "甲仙區", "六龜區", "茂林區", "桃源區", "那瑪夏區"];

$(function(){
	$('#day').on('change', function(){
		if($(this).val()){
			var day = moment($(this).val()).format('YYYY-MM-DD');
			load(day);
		}
	});

	$('nav ul li').on('click', function(){
		$('section').hide();
		$('section.' + $(this).data('to')).show();
		$(this).addClass('active').siblings().removeClass('active');
	});
});

function initMap(){
	map = new google.maps.Map(document.getElementById('map'), {
		center: {lng: 120.5786888, lat: 22.9185024},
		zoom: 9,
		styles: [{"featureType":"administrative","elementType":"all","stylers":[{"visibility":"off"}]},{"featureType":"landscape","elementType":"all","stylers":[{"visibility":"simplified"},{"hue":"#0066ff"},{"saturation":74},{"lightness":100}]},{"featureType":"poi","elementType":"all","stylers":[{"visibility":"simplified"}]},{"featureType":"road","elementType":"all","stylers":[{"visibility":"simplified"}]},{"featureType":"road.highway","elementType":"all","stylers":[{"visibility":"off"},{"weight":0.6},{"saturation":-85},{"lightness":61}]},{"featureType":"road.highway","elementType":"geometry","stylers":[{"visibility":"on"}]},{"featureType":"road.arterial","elementType":"all","stylers":[{"visibility":"off"}]},{"featureType":"road.local","elementType":"all","stylers":[{"visibility":"on"}]},{"featureType":"transit","elementType":"all","stylers":[{"visibility":"simplified"}]},{"featureType":"water","elementType":"all","stylers":[{"visibility":"simplified"},{"color":"#5f94ff"},{"lightness":26},{"gamma":5.86}]}],
		disableDefaultUI: true
	});
	map.data.loadGeoJson('./data/kaohsiung.json');

	var day = moment(new Date()).format('YYYY-MM-DD');
	$('#day').val(day);

	load(day);
}

function load(day, cb){
	console.log('load');
	works_time = {};
	$('#loading').show();
	$('.work').each(function(){
		works[$(this).attr('id')] = {};
		Array.from(charts).forEach(c => {
			c.destroy();
		});
	});
	for(var i=0;i<districts.length;i++){
		works_district[i] = 0;
	}

	$.getJSON(API_URL + '?date=' + day, function(res){
		var maxWorkDistrct = 0;
		$('#list-table').find('tbody').html('')
		$('#count-today').find('.work-count').text(~~res.length);
		console.log(res.length)
		for(var i=0;i<res.length;i++){
			console.log('for')
			var event = res[i];

			var work = getCategoryByName(event.informDesc);
			if(!works[work]) works[work] = {};
			if(!works_time[hour]) works_time[hour] = {};

			var hour = new Date(event.cre_Date).getHours();

			works[work].total = !isNaN(works[work].total) ? works[work].total+1 : 1;
			works[work][hour] = !isNaN(works[work][hour]) ? works[work][hour]+1 : 1;
			works_time[hour] = !isNaN(works_time[hour]) ? works_time[hour] + 1 : 1;
			works_district[ districts.indexOf(event.zipName) ]++;
			if(works_district[ districts.indexOf(event.zipName) ] > maxWorkDistrct) maxWorkDistrct = works_district[ districts.indexOf(event.zipName) ];

			desc = event.beforeDesc;
			if(event.afterDesc){
				desc += '<br><br><div style="padding-left: 1rem"><i class="fas fa-hand-point-right"></i>' + event.afterDesc + '</div>';
			}

			var scale = chroma.scale(['#B71C1C', '#9CCC65']);
			var color = scale(~~event.status / 5).hex();

			$($('#list-table').find('tbody')[0]).append(
				'<tr>'+
				'<td style="border-left: 5px solid '+ color +'">' + event.fileNo + '</td>' +
				'<td>' + event.unitName + '</td>' +
				'<td>' + event.zipName + '</td>' +
				'<td>' + desc + '</td>' +
				'<td>' + moment(event.cre_Date).format('HH:mm') + '</td>' +
				'</tr>'
			)
		}
		Object.keys(works).forEach(function(w){
			if($('#' + w).find('canvas').length){
				$('#' + w).find('.work-count').text(works[w].total || 0);
				var ctx = $('#' + w).find('canvas');
				var dataLine = [];

				for(var i=0;i<24;i++){
					if(!isNaN(works[w][''+ i])){
						dataLine.push(works[w][i]);
					}else{
						dataLine.push(0);
					}
				}

				generateChart(ctx, dataLine);
			}
		});
		var countToday = [];
		for(var i=0;i<24;i++){
			if(!isNaN(works_time[i])){
				countToday.push(works_time[i]);
			}else{
				countToday.push(0);
			}
		}
		generateChart($('#count-today').find('canvas'), countToday);

		map.data.setStyle(function(feature){
			var name = feature.f.T_Name;
			var count = works_district[districts.indexOf(name)];

			// var s = works_district.sort(function(a,b) { return a - b; });

			var percent = count / maxWorkDistrct;
			var scale = chroma.scale(['white', '#D00000']);

			feature.setProperty('isColorful', true)
			return {
				fillColor: scale(percent).hex(),
				fillOpacity: 0.7,
				strokeWeight: 0.7,
			}
		});

		$('#loading').hide();
	});

	if(cb && {}.toString.call(cb) === '[object Function]') cb();
}

function generateChart(ctx, dataLine){
	var chart = new Chart(ctx, {
		type: 'line',
		data: {
			labels: ['0:00', '1:00', '2:00', '3:00', '4:00', '5:00',
				'6:00', '7:00', '8:00', '9:00', '10:00', '11:00',
				'12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
				'18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
			],
			// labels: ['0', '1', '2', '3', '4', '5',
			// 	'6', '7', '8', '9', '10', '11',
			// 	'12', '13', '14', '15', '16', '17',
			// 	'18', '19', '20', '21', '22', '23'
			// ],
			datasets: [{
				label: '受理案件',
				backgroundColor: '#FFBA08',
				borderColor: '#FFBA08',
				data: dataLine,
			}]
		},
		options: {
			legend: {
				display: false
			},
			tooltips: {
				callbacks: {
					label: function(tooltipItem) {
						return tooltipItem.yLabel;
					}
				}
			},
			scales: {
				yAxes: [{
					ticks: {
						beginAtZero: true
					}
				}]
			},
		}
	});
	charts.push(chart);
}

function getCategoryByName(name){
	switch(name){
		case '路面坑洞(一)':
		case '路面坑洞(二)':
		case '路面下陷(一)':
		case '路面下陷(二)':
		case '路面掏空(一)':
		case '路面掏空(二)':
		case '台電-路面填補不實':
		case '中華-路面填補不實':
		case '人孔蓋鬆動':
		case '台電-孔蓋鬆動':
		case '中華-孔蓋鬆動':
		case '寬頻孔蓋坑洞':
		case '寬頻孔蓋鬆動破損':
		case '中華-孔蓋路面下陷':
		case '台電-孔蓋路面下陷':
		case '道路回填不實':
		case '施工回填不實、人孔蓋凹陷坑洞':
		case '人孔蓋凹陷坑洞(一)':
		case '人孔蓋凹陷坑洞(二)':
		case '人孔、溝蓋鬆動(一)':
		case '人孔、溝蓋鬆動(二)':
		case '溝蓋破損(一)':
		case '溝蓋破損(二)':
		case '人手孔凹陷':
		case '人手孔破損':
		case '路面塌陷(一)':
		case '路面塌陷(二)':
		case '寬頻管線破損':
		case '省道破損':
		case '縣、鄉道破損':
		case '農道破損':
		case '管線問題':
		case '管道(工程通報)':
			return 'work-road';
		case '地下道、路面積水(一)':
		case '地下道、路面積水(二)　養工處2':
		case '污水管阻塞(一)':
		case '暴雨積水(一)':
		case '暴雨積水(二)':
			return 'work-pipe';
		case '路燈故障(一)':
		case '公所-路燈故障(二)':
		case '養工-路燈故障(二)':
		case '路燈白天未熄(一)':
		case '公所-路燈白天未熄(二)':
		case '養工-路燈白天未熄(二)':
			return 'work-light';
		case '人行道破損(一)':
		case '人行道破損(二)':
		case '人行道設施損壞(一)':
		case '公所-人行道設施損壞(二)':
		case '養工-人行道設施損壞(二)':
		case '公園、綠地設施損毀(一)':
		case '公園髒亂、佔用(一)':
		case '公園土木局部損壞':
		case '公所-公園、綠地設施損毀(二)':
		case '公所-公園髒亂、佔用(二)':
		case '養工-公園、綠地設施損毀(二)':
		case '養工-公園髒亂、佔用(二)':
		case '安全島髒亂':
		case '安全島雜草叢生(一)':
		case '安全島雜草叢生(二)':
		case '路樹傾倒(一)':
		case '養工-路樹傾倒(二)':
		case '公所-路樹傾倒(二)':
			return 'work-park';
		case '號誌故障':
		case '號誌秒差調整':
			return 'work-traffic';
		case '違規停車':
		case '佔用道路':
		case '交通疏導':
		case '妨害安寧':
		case '急迫危害立即排除':
			return 'work-car';
		case '路面油漬':
		case '空氣污染':
		case '噪音':
		case '髒亂清除':
		case '垃圾清運':
		case '小廣告、旗幟':
		case '人行道髒亂':
		case '怠速':
		case '燃放爆竹':
			return 'work-noise';
		case '動物受傷、受困、挨餓':
		case '攻擊性流浪犬捕捉':
		case '動物受困':
		case '動保測試項目':
		case '攻擊性流浪犬捕捉、動物受傷':
			return 'work-animal';
		case '風景區髒亂':
		case '風景區設備損壞有立即危險者':
			return 'work-view';
		case '停水':
		case '消防栓漏水':
		case '檢修管線':
			return 'work-water';
		case '電線掉落':
		case '變壓器有聲音':
		case '停電':
		case '漏電':
			return 'work-electricity';
		case '瓦斯外洩':
		case '欣高-孔蓋路面下陷':
		case '欣高-孔蓋鬆動':
		case '欣高-路面填補不實':
			return 'work-gas'
	}
}
