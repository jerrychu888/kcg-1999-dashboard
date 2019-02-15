var API_URL = 'https://soweb.kcg.gov.tw/open1999/ServiceRequestsQuery.asmx/ServiceRequestsQuery';

var works = {};
var works_time = {};
var works_district = [];
var charts = [];
var map, mapSmall, markerEvent = [];
var districts = ["楠梓區", "左營區", "鼓山區", "三民區", "鹽埕區", "前金區", "新興區", "苓雅區", "前鎮區", "旗津區", "小港區", "鳳山區", "大寮區", "鳥松區", "林園區", "仁武區", "大樹區", "大社區", "岡山區", "路竹區", "橋頭區", "梓官區", "彌陀區", "永安區", "燕巢區", "田寮區", "阿蓮區", "茄萣區", "湖內區", "旗山區", "美濃區", "內門區", "杉林區", "甲仙區", "六龜區", "茂林區", "桃源區", "那瑪夏區"];
var weeklyData, mapData, mapDataSmall;

var intervalTimeline;

$(function(){
	// $('#day').on('change', function(){
	// 	if($(this).val()){
	// 		var day = moment($(this).val()).format('YYYY-MM-DD');
	// 		load(day);
	// 	}
	// });

	$('section').hide();
	$('section.dashboard').show().animateCss('fadeIn');

	$('nav ul li').on('click', function(){
		$('section').hide();
		$('section.' + $(this).data('to')).show().animateCss('fadeIn');
		$(this).addClass('active').siblings().removeClass('active');

		switch($(this).data('to')){
			case 'dashboard':
				$('header h1').text('高雄市 1999 市政儀表板');
				break;
			case 'list':
				$('header h1').text('高雄市 1999 報案總覽');
				break;
			case 'map':
				resetTimeline();
				$('header h1').text('高雄市 1999 報案時空分佈');
				break;
			case 'the-streamgraph':
				chart(column,filterBy,groupBy);
				$('header h1').text('高雄市 1999 量化波形圖');
				break;
			default:

		}
	});

	// $('#yesterday').on('click', function(){
	// 	var day = moment($('#day').val()).add(-1, 'days').format('YYYY-MM-DD')
	// 	$('#day').val(day);
	// 	load(day);
	// });

	// $('#tomorrow').on('click', function(){
	// 	var day = moment($('#day').val()).add(1, 'days').format('YYYY-MM-DD');
	// 	$('#day').val(day);
	// 	load(day);
	// });

	$('#today').on('click', function(){
		// var day = moment(new Date()).format('YYYY-MM-DD');
		// $('#day').val(day);
		// load(day);
		var d = moment(new Date());
		$('#day').data('daterangepicker').setStartDate(d);
		$('#day').data('daterangepicker').setEndDate(d);
		load(d.format('YYYY-MM-DD'), d.format('YYYY-MM-DD'));
	});

	$(document).scroll(function() {
		if ($(this).scrollTop() > $(window).height()) {
		  $('#go-top').fadeIn();
		} else {
		  $('#go-top').fadeOut(1000);
		}
	});

	$('#go-top').on('click', function(){
		$("html, body").animate({
			scrollTop: 0
		}, {
			duration: 500,
			easing: "swing"
		});
	});

	$('#thisyear').text(moment().format('YYYY'));

	$('#day').daterangepicker({
		// minDate: moment(new Date()).add(-10, 'days'),
		maxDate: moment(new Date()),
		startDate: moment(new Date()),
		endDate: moment(new Date()),
		maxSpan: {
			months: 2,
		},
		opens: 'left',
	}, function(d){
		var startDate = $('#day').data('daterangepicker').startDate.format('YYYY-MM-DD');
		var endDate = $('#day').data('daterangepicker').endDate.format('YYYY-MM-DD');
		load(startDate, endDate)
	});
});

function initMap(){
	mapSmall = L.map('map_small').setView([22.9185024, 120.5786888], 9);
	L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		attribution: '<a href="https://www.openstreetmap.org/">OSM</a>',
		maxZoom: 18,
	}).addTo(mapSmall);

	map = L.map('map').setView([22.9185024, 120.5786888], 9);
	L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		attribution: '<a href="https://www.openstreetmap.org/">OSM</a>',
		maxZoom: 18,
	}).addTo(map);

	$.getJSON('./data/kaohsiung.json', function(r){
		mapDataSmall = L.geoJSON(r, {color: '#333', weight: 0.7}).addTo(mapSmall);
		mapData = L.geoJSON(r, {color: '#333', weight: 0.7}).addTo(map);
	});

	// var day = moment(new Date()).format('YYYY-MM-DD');
	var today = moment(new Date()).format('YYYY-MM-DD');

	load(today, today);

	LOAD_2018_2019(API_URL + '?startDate=' + today + '&endDate=' + today, function(data){
		var streamgraphRawData = [];
		Array.from(data).forEach(function(event){
			var type = getNameByCategory(getCategoryByName(event.informDesc));
			var time = '20' + moment(event.cre_Date).format('HH');
			streamgraphRawData.push({
				year: time,
				place: type,
				type: 'kcg',
			});
			if(time === '2023'){
				streamgraphRawData.push({
					year: '2024',
					place: type,
					type: 'kcg',
				});
			}
		});
		window.weeklyData = streamgraphRawData;
		$('.streamgraph-wrapper h3').text(today + '~' + today + ' 報案資料');
		if($('header h1').text() === '高雄市 1999 量化波形圖') chart(column,filterBy,groupBy);
	});
}

function load(startDate, endDate, skipLoading = false){
	works_time = {};
	if(skipLoading !== true){
		$('#loading').show();
	}else{
		if(
			moment(new Date).format('YYYY-MM-DD') !==
			moment($('#day').data('daterangepicker').startDate).format('YYYY-MM-DD')
		) return;
	}
	$('.work').each(function(){
		works[$(this).attr('id')] = {};
		Array.from(charts).forEach(function(c){
			c.destroy();
		});
	});
	for(var i=0;i<districts.length;i++){
		works_district[i] = 0;
	}
	for(var i=0;i<markerEvent.length;i++){
		map.removeLayer(markerEvent[i]);
	}
	markerEvent = [];

	var maxWorkDistrct = 0;
	var workAchiveCount = 0;
	var workAchiveProCount = 0;
	var workAchiveProTime = 0;

	LOAD_2018_2019(API_URL + '?startDate=' + startDate + '&endDate=' + endDate, function(res){

		$('#list-table').find('tbody').html('')
		$('#count-today').find('.work-count').text(~~res.length);
		for(var i=0;i<res.length;i++){
			var event = res[i];

			var work = getCategoryByName(event.informDesc);

			if(event.lat && event.lng){
				var iconpath = getIconpathByWork(work);
				var d = new Date(event.cre_Date);
				var marker = L.marker([event.lat, event.lng], {
					icon: L.icon({
						iconUrl: iconpath,
					}),
					fileNo: event.fileNo,
					time: d.getHours() * 60 + d.getMinutes(),
					type: work,
				});
				marker.addTo(map);
				marker.on('click', function(){
					$('nav ul li').get(1).click();
					var fileNo = this.options.fileNo;
					var target = $('#list-table').find('tr').filter(function(){
						return $(this).html().includes(fileNo);
					});
					var top = target.offset().top;
					$('html, body').stop().animate({scrollTop: top - 100}, 500, 'swing');
					setTimeout(function(){
						$(target).animateCss('flash')
					}, 500);
				});
				markerEvent.push(marker);
			}

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
			}else if(~~event.status === 1 && event.beforeDesc.trim() === ''){
				desc = '<span style="color: #777">建立案件中......</span>'
			}

			var scale = chroma.scale(['#B71C1C', '#9CCC65']);
			var color = scale(~~event.status / 5).hex();

			$($('#list-table').find('tbody')[0]).append(
				'<tr data-type="' + work + '">'+
				'<td style="border-left: 5px solid '+ color +'">' + event.fileNo + '</td>' +
				'<td style="border-left-color: '+ color +'">' + event.unitName + '</td>' +
				'<td>' + event.zipName + '</td>' +
				'<td>' + desc + '</td>' +
				'<td>' + moment(event.cre_Date).format('MM/DD HH:mm') + '</td>' +
				'</tr>'
			);

			if(~~event.status >= 4) workAchiveCount++;
			if(~~event.status === 5){
				workAchiveProCount++;
				workAchiveProTime += new Date(event.close_Date) - new Date(event.cre_Date);
			}
		}
		$('#count-achivement').find('.work-count').text(Math.floor((100 * workAchiveCount / res.length) || 0) + '%');
		$('#count-achivement-pro').find('.work-count').text(Math.floor((100 * workAchiveProCount / res.length) || 0) + '%');
		$('#count-achivement-time-pro').find('.work-count').text(moment.duration((workAchiveProTime / workAchiveProCount) || 0).locale('zh-tw').humanize())
		var scale = chroma.scale(['#B71C1C', '#9CCC65']);
		$('#count-achivement').css('background', scale(workAchiveCount / res.length).hex());
		$('#count-achivement-pro').css('background', scale(workAchiveProCount / res.length).hex());
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

		var chart = new Chart($('#count-donut').find('canvas'), {
			type: 'doughnut',
			data: {
				datasets: [{
					data:
						Object.keys(works)
						.filter(function(x){return x !== 'undefined'})
						.filter(function(x){return works[x].total})
						.map(function(x){return works[x].total})
						.sort(function(a, b){return b-a}),
					backgroundColor: ['#66C2A5', '#FC8D62', '#8Da0cb', '#e78ac3', '#a6d854', '#ffd92f', '#e5c494', '#B3B3B3']
				}],
				labels:
					Object.keys(works)
					.filter(function(x){return x !== 'undefined'})
					.filter(function(x){return works[x].total})
					.sort(function(a, b){return works[b].total - works[a].total})
					.map(function(x){return getNameByCategory(x)})
			},
			options: {
				legend: {
					display: false
				}
			}
		});
		charts.push(chart);

		var streamgraphRawData = [];
		Array.from(res).forEach(function(event){
			var type = getNameByCategory(getCategoryByName(event.informDesc));
			var time = '20' + moment(event.cre_Date).format('HH');
			streamgraphRawData.push({
				year: time,
				place: type,
				type: 'kcg',
			});
			if(time === '2023'){
				streamgraphRawData.push({
					year: '2024',
					place: type,
					type: 'kcg',
				});
			}
		});
		window.weeklyData = streamgraphRawData;
		$('.streamgraph-wrapper h3').text(startDate + '~' + endDate + ' 報案資料');
		if($('header h1').text() === '1999 量化波形圖') chart(column,filterBy,groupBy);


		if(mapData){
			mapDataSmall.eachLayer(function(layer){
				var name = layer.feature.properties.T_Name;
				var count = works_district[districts.indexOf(name)];

				var percent = count / maxWorkDistrct;
				var scale = chroma.scale(['white', '#D00000']);

				layer.setStyle({
					fillColor: scale(percent).hex(),
					fillOpacity: 0.7,
				});
			});
		}

		if(mapData) {
			mapData.eachLayer(function(layer){
				var name = layer.feature.properties.T_Name;
				var count = works_district[districts.indexOf(name)];

				var percent = count / maxWorkDistrct;
				var scale = chroma.scale(['white', '#D00000']);

				layer.setStyle({
					fillColor: scale(percent).hex(),
					fillOpacity: 0.7,
				});
			});
		}

		$('#loading').hide();
		if(moment(endDate).diff(moment(startDate)) === 0) {
			var yesterday = moment(startDate).add(-1, 'days').format('YYYY-MM-DD');
			loadYesterday(yesterday);
			$('.yesterday').show();
			$('.timeline').show();
		} else {
			$('.yesterday').hide();
			$('.timeline').hide();
		}

		if(!skipLoading && $('h1').text().endsWith('量化波形圖')) {
			$($('nav ul li')[0]).click();
		}
	});

	resetTimeline();
}

$('.map-filter').on('click', function(){
	$(this).addClass('active').siblings().removeClass('active');
	if(markerEvent.length){
		if($(this).data('filter') !== 'all'){
			markerEvent.forEach(function(m){
				map.removeLayer(m);
			});
			var filter = $(this).data('filter');
			markerEvent.filter(function(x){return x.options.type === filter}).forEach(function(m){
				map.addLayer(m);
			});
		}else{
			markerEvent.forEach(function(m){
				map.addLayer(m);
			});
		}
	}
});

$('.list-filter').on('click', function(){
	$(this).addClass('active').siblings().removeClass('active');
	if($(this).data('filter') !== 'all'){
		var filter = $(this).data('filter');
		$('#list-table').find('tr').hide();
		$('#list-table').find('tr').filter(function(){return $(this).data('type') === filter;}).show();
	}else{
		$('#list-table').find('tr').show();
	}
});

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

function startTimeline(){
	var speed = ~~$('.timeline-speed').text().slice(0, -1);
	$('.timeline-play').html('<i class="fas fa-pause" />');
	if(intervalTimeline) clearInterval(intervalTimeline);
	intervalTimeline = setInterval(function(){
		var n = $('.timeline input').val();
		$('.timeline input').val(~~n + 1);
		$('.timeline input').change();
	}, 1000 / speed);
	$('.timeline-play').off('click');
	$('.timeline-play').on('click', function(){stopTimeline()});
}

function stopTimeline(){
	$('.timeline-play').html('<i class="fas fa-play" />');
	if(intervalTimeline) clearInterval(intervalTimeline);
	$('.timeline-play').on('click', function(){startTimeline()});
}

function resetTimeline(){
	stopTimeline();
	$('.timeline input').val(new Date().getHours() * 60 + new Date().getMinutes());
	$('.timeline-now').text(moment(new Date()).format('HH:mm'));
}

$('.timeline-play').on('click', function(){startTimeline(1)});
$('.timeline-fast').on('click', function(){
	var speed = ~~$('.timeline-speed').text().slice(0, -1);
	if(speed < 16) speed *= 2;
	$('.timeline-speed').text(speed + 'x');
	stopTimeline();
	startTimeline();
});
$('.timeline-slow').on('click', function(){
	var speed = ~~$('.timeline-speed').text().slice(0, -1);
	if(speed > 1) speed /= 2;
	$('.timeline-speed').text(speed + 'x');
	stopTimeline();
	startTimeline();
});
$('.timeline input').on('change', function(){
	var range = $(this).val();
	markerEvent.filter(function(x){
		return x.options.time <= range;
	}).forEach(function(m){
		if(m.map !== map) map.addLayer(m);
	});
	markerEvent.filter(function(x){
		return x.options.time > range;
	}).forEach(function(m){
		map.removeLayer(m);
	});
	var n = $('.timeline input').val();
	var hh = Math.floor(n / 60);
	if(hh < 10) hh = '0' + hh;
	var mm = Math.floor(n % 60);
	if(mm < 10) mm = '0' + mm;

	$('.timeline input').val(~~n + 1);
	$('.timeline-now').text(hh + ':' + mm);
});

function loadYesterday(day){
	var day = moment(day).add(-1, 'day').format('YYYY-MM-DD');
	var works_yesterday = {};
	var works_time_yesterday = {};

	LOAD_2018_2019(API_URL + '?startDate=' + day + '&endDate=' + day, function(res){
		if(res.length){
			var maxWorkDistrct = 0;
			var workAchiveCount = 0;
			var workAchiveProCount = 0;
			var workAchiveProTime = 0;

			for(var i=0;i<res.length;i++){
				var event = res[i];

				var work = getCategoryByName(event.informDesc);

				if(!works_yesterday[work]) works_yesterday[work] = {};
				if(!works_time_yesterday[hour]) works_time_yesterday[hour] = {};

				var hour = new Date(event.cre_Date).getHours();

				works_yesterday[work].total = !isNaN(works_yesterday[work].total) ? works_yesterday[work].total+1 : 1;
				works_yesterday[work][hour] = !isNaN(works_yesterday[work][hour]) ? works_yesterday[work][hour]+1 : 1;
				works_time_yesterday[hour] = !isNaN(works_time_yesterday[hour]) ? works_time_yesterday[hour] + 1 : 1;

				if(~~event.status >= 4) workAchiveCount++;
				if(~~event.status === 5){
					workAchiveProCount++;
					workAchiveProTime += new Date(event.close_Date) - new Date(event.cre_Date);
				}
			}
			works_yesterday[work][hour] = !isNaN(works_yesterday[work][hour]) ? works_yesterday[work][hour]+1 : 1;
			Object.keys(works).forEach(function(w){
				if(!works_yesterday[w]) works_yesterday[w] = {total: 0};
			});
			Object.keys(works_yesterday).forEach(function(w){
				var count = 0;
				var hour = new Date().getHours();
				if(moment(day).add(1, 'days').unix() < moment(new Date().setHours(0, 0, 0, 0)).unix()) hour = 23;
				for(var i=0;i<=hour;i++){
					works_yesterday[work][hour] = !isNaN(works_yesterday[work][hour]) ? works_yesterday[work][hour]+1 : 1;
					if(!isNaN(works_yesterday[w][i])) count += works_yesterday[w][i];
				}
				if(!isNaN(Number($('#' + w).find('.work-count').text()))){
					var now = Number($('#' + w).find('.work-count').text());
					var a = now - count;
					var text = (a >= 0 ? '△ +' : '▽ ') + a + '(' + (a >= 0 ? '+' : '') + Math.floor(count > 0 ? (100 * a / count) : (100 * a / 1)) + '%)'
					$('#' + w).find('.yesterday-count').text(text);
					$('#' + w).find('.yesterday-desc').text('和前一天此時相比');
				}
				// var now = Number($('#' + w).find('.work-count').text());
				// var a = now - count;
				// var text = (a >= 0 ? '△ +' : '▽ ') + a + '(' + (a >= 0 ? '+' : '') + Math.floor(100 * a / (count || 1)) + '%)'
				// $('#' + w).find('.yesterday-count').text(text);
				// $('#' + w).find('.yesterday-desc').text('和前一天此時相比');
			});
			var now = Number($('#count-today').find('.work-count').text());
			var a = now - res.length;
			var text = (a >= 0 ? '△ +' : '▽ ') + a + '(' + (a >= 0 ? '+' : '') + Math.floor(100 * a / res.length) + '%)'
			$('#count-today').find('.yesterday-count').text(text);
			$('#count-today').find('.yesterday-desc').text('和前一天此時相比');
		}
	});
}

function getIconpathByWork(work){
	var iconpath = './image/';
	switch(work){
		case 'work-road':
			iconpath += 'road.png'; break;
		case 'work-pipe':
			iconpath += 'tint.png'; break;
		case 'work-light':
			iconpath += 'lightbulb.png'; break;
		case 'work-park':
			iconpath += 'tree.png'; break;
		case 'work-traffic':
			iconpath += 'sign.png'; break;
		case 'work-car':
			iconpath += 'car.png'; break;
		case 'work-noise':
			iconpath += 'bullhorn.png'; break;
		case 'work-animal':
			iconpath += 'paw.png'; break;
		case 'work-view':
			iconpath += 'seedling.png'; break;
		case 'work-water':
			iconpath += 'bath.png'; break;
		case 'work-electricity':
			iconpath += 'bolt.png'; break;
		case 'work-gas':
			iconpath += 'industry.png'; break;
		default:
			iconpath += 'question.png';
	}
	return iconpath;
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
		default:
			return getCategoryByName2019(name)
	}
}

function getNameByCategory(x){
	switch(x){
		case 'work-road': return '道路不平';
		case 'work-pipe': return '積水、汙水管';
		case 'work-light': return '路燈故障';
		case 'work-park': return '公園、路樹、人行道';
		case 'work-traffic': return '交通號誌';
		case 'work-car': return '交通違規、路霸';
		case 'work-noise': return '髒亂、噪音、空汙';
		case 'work-animal': return '動物保護';
		case 'work-view': '風景區維護';
		case 'work-water': return '自來水相關';
		case 'work-electricity': return '電力相關';
		case 'work-gas': return '不明氣體外洩';
	}
}

$.fn.extend({
	animateCss: function(animationName, callback) {
	var animationEnd = (function(el) {
		var animations = {
		animation: 'animationend',
		OAnimation: 'oAnimationEnd',
		MozAnimation: 'mozAnimationEnd',
		WebkitAnimation: 'webkitAnimationEnd',
		};

		for (var t in animations) {
			if (el.style[t] !== undefined) {
				return animations[t];
			}
		}
	})(document.createElement('div'));

	this.addClass('animated ' + animationName).one(animationEnd, function() {
		$(this).removeClass('animated ' + animationName);

		if (typeof callback === 'function') callback();
	});

	return this;
	},
});

setInterval(function(){
	load(moment(new Date).format('YYYY-MM-DD'), moment(new Date).format('YYYY-MM-DD'), true);
}, 5000);

initMap();

function LOAD_2018_2019(URL, callback) {
	var startDate = moment(URL.match(/([0-9]{4})-([0-9]{2})-([0-9]{2})/)[0]).unix();

	URL = URL.replace(/([0-9]{4})-([0-9]{2})-([0-9]{2})/g, '$1$2$3');
	$.getJSON(URL, function(data){
		var newData = data.map(function(x){
			var d = {};
			Object.keys(x).forEach(function(key, i){
				var newKey = key.charAt(0).toLowerCase() + key.slice(1);
				newKey = newKey.slice(0, -1);
				switch(newKey){
					case 'cre_Date':
					case 'save_Date':
					case 'close_Date':
						d[newKey] = OLDDATE_TO_NEWDATE(x[key]);
						break;
					default:
						d[newKey] = x[key];
				}
			});
			return d;
		});

		newData = newData.filter(function(event){
			return (moment(event.cre_Date).unix() > startDate);
		});
		callback(newData);
	});
}

function OLDDATE_TO_NEWDATE(oldDate){
	oldDate = oldDate.trim();
	if(oldDate === '') return null;
	var dates = oldDate.split(' ');

	var date = moment(new Date(dates[0])).format('YYYY-MM-DD');
	var hour = ~~dates[2].split(':')[0];
	if(dates[1] === '下午' && hour !== 12) hour += 12;
	if(hour === 12 && dates[1] === '上午') hour -= 12;
	var minAndSec = dates[2].split(':').slice(1).join(':');
	if(hour < 10) hour = '0' + hour;
	newDate = date + 'T' + hour + ':' +  minAndSec;
	return newDate;
}

function getCategoryByName2019(name){
	switch(name){
		case '道路挖掘_人孔蓋': return 'work-road';
		case '道路挖掘_管線工程': return 'work-road';
		case '共同管道_寬頻管道管理': return 'work-road';
		case '路燈_維護管理（立即處理）': return 'work-light';
		case '道路_道路管理': return 'work-road';
		case '道路_路面不平（立即處理）': return 'work-road';
		case '道路_安全島雜草叢生': return 'work-park';
		case '公園、濕地及綠地_維護管理（立即處理）': return 'work-park';
		case '行道樹、人行道_行道樹維護管理（立即處理）': return 'work-park';
		case '行道樹、人行道_人行道維護管理(立即處理)': return 'work-park';
		case '空氣污染_冒煙或排煙': return 'work-noise';
		case '空氣污染_怠速運轉': return 'work-noise';
		case '空氣污染_揚塵': return 'work-noise';
		case '空氣污染_其他': return 'work-noise';
		case '異味污染_製程(生產過程)': return 'work-noise';
		case '異味污染_廢污水': return 'work-noise';
		case '異味污染_廢棄物或資源回收': return 'work-noise';
		case '異味污染_有機氣體(含溶劑)或化學物質': return 'work-noise';
		case '異味污染_廚餘': return 'work-noise';
		case '異味污染_油煙': return 'work-noise';
		case '異味污染_動物': return 'work-noise';
		case '異味污染_施肥': return 'work-noise';
		case '異味污染_沼氣(瓦斯)': return 'work-gas';
		case '異味污染_露天燃燒': return 'work-noise';
		case '異味污染_燃燒稻草': return 'work-noise';
		case '異味污染_燃燒行為_燒香或紙錢': return 'work-noise';
		case '異味污染_不明': return 'work-gas';
		case '異味污染_其他': return 'work-gas';
		case '噪音_擴音設備': return 'work-noise';
		case '噪音_固定動力': return 'work-noise';
		case '噪音_動力機具': return 'work-noise';
		case '噪音_裝潢作業': return 'work-noise';
		case '噪音_冷氣、空調設備': return 'work-noise';
		case '噪音_民俗噪音': return 'work-noise';
		case '噪音_機電設備': return 'work-noise';
		case '噪音_其他': return 'work-noise';
		case '水污染_未處理排放': return 'work-noise';
		case '水污染_滲出水': return 'work-pipe';
		case '水污染_逕流污水': return 'work-noise';
		case '水污染_繞流與暗管': return 'work-pipe';
		case '水污染_河川汙染': return 'work-noise';
		case '水污染_其他': return 'work-pipe';
		case '環境衛生_動物死屍': return 'work-animal';
		case '環境衛生_堆放垃圾': return 'work-noise';
		case '環境衛生_街道清理、污染': return 'work-noise';
		case '環境衛生_環境髒亂': return 'work-noise';
		case '環境衛生_張貼廣告物': return 'work-noise';
		case '道路交通設施_號誌維護': return 'work-traffic';
		case '其他警政類_妨害安寧': return 'work-car';
		case '其他警政類_急迫危害立即排除': return 'work-noise';
		case '交通維持_違規停車': return 'work-car';
		case '交通維持_佔用道路': return 'work-car';
		case '交通維持_交通疏導': return 'work-car';
		case '動物防疫保護_攻擊性流浪犬捕捉': return 'work-animal';
		case '動物防疫保護_動物(犬貓)救傷': return 'work-animal';
		case '動物防疫保護_動物(犬貓)救援': return 'work-animal';
		case '排水問題_積水': return 'work-water';
		case '溝蓋(渠)問題_溝蓋維護': return 'work-road';
		case '污水問題_污水管線維護': return 'work-pipe';
		case '風景區管理_設施損壞有立即危險者': return 'work-view';
		case '風景區管理_環境髒亂': return 'work-view';
		case '台電業務_人孔、溝蓋鬆動': return 'work-road';
		case '台電業務_路面塌陷': return 'work-road';
		case '台電業務_變壓器有聲音': return 'work-electricity';
		case '台電業務_漏電': return 'work-electricity';
		case '台電業務_停電': return 'work-electricity';
		case '台電業務_路面填補不實': return 'work-road';
		case '台電業務_電線掉落': return 'work-electricity';
		case '自來水業務_消防栓、漏水': return 'work-water';
		case '自來水業務_停水': return 'work-water';
		case '自來水業務_檢修管線': return 'work-water';
		case '公園、濕地及綠地_維護管理': return 'work-park';
		case '公園、濕地及綠地_違規使用': return 'work-park';
		case '共同管道_共同管道管理': return 'work-pipe';
		case '其他水利類_其他水利類': return 'work-water';
		case '其他警政類_其他警政類業務': return 'work-noise';
		case '其他警政類_警紀督察': return 'work-traffic';
		case '動物防疫保護_其他動物防疫保護': return 'work-animal';
		case '水利工程施工問題_未設置安全設施': return 'work-water';
		case '污水問題_污水用戶接管': return 'work-pipe';
		case '溝蓋(渠)問題_溝渠維護': return 'work-road';
		case '環境衛生_其他': return 'work-noise';
		case '行道樹、人行道_人行道維護管理': return 'work-park';
		case '路燈_維護管理': return 'work-light';
		case '道路_路面維護': return 'work-road';
		case '道路交通設施_號誌新設或調整': return 'work-traffic';
		case '道路挖掘_其他建議事項': return 'work-road';
		case '風景區管理_設施增設': return 'work-view';
		case '風景區管理_設施損壞': return 'work-view';
		case '中華電信_路面填補不實': return 'work-road';
		default:
			return '其他';
	}
}
