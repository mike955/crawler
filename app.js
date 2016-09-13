'use strict'

import fetch from 'isomorphic-fetch';
import cheerio from 'cheerio';
import json2csv from 'json2csv';
import es6_promise from 'es6-promise';
import _ from 'lodash';
import fs from 'fs';

es6_promise.polyfill();

export default class AllClass{

	/*********************************
	获取URL的的整个HTML
	**********************************/
	static async get_url(req, res){ 
		let fetch_pages = await fetch('http://www.imooc.com/course/list?c=fe');

		fetch_pages = await  fetch_pages.text() + ''; 
		return fetch_pages;
	}


	/*********************************
	获取分页的页数URL
	**********************************/
	static async get_pages(req, res){
		let $ = cheerio.load(req);
		
		let pages = $('div.page').find('a');
		
		let page_urls = [ 'http://www.imooc.com/course/list?c=fe' ];
		pages.each(function(item){
			//第一a标签的href无效，已经提前存在page_urls里面了
			if(item > 0){
				let page = $(this);
				let page_url = 'http://www.imooc.com' + page.prop('href');

				page_urls.push(page_url);
			}			
		});
		return page_urls;
	}


	/*********************************
	获取每个分页页面的课程信息
	**********************************/
	static async course_data(req, res){
		let pages = req;

		/**********************************************
			课程信息
			course = [{
				name: ,
				img: ,
				URL: ,
				description: ,
				difficultLevel: ,
				price: ,
				proven:   //是否实战
			}]
		***********************************************/
		let courseArray = [];

		for(let m = 0; m < pages.length; m++){
			let url_data = await fetch(pages[m]);
			let html = await url_data.text() + '';

			let $ = cheerio.load(html);
			let courses= $('div.moco-course-list').find('ul.clearfix').find('a');

			courses.each(function(item){
				let course = $(this);

				/* 判断是否是实战课程 */
				let courseJudge = course.prop('onclick');
				if(courseJudge === "_hmt.push(['_trackEvent', '课程列表页', 'click', '列表实战推荐'])"){ //实战课程
					let course_data = {};

					course_data.URL = 'www.imooc.com' + course.prop('href');	
					//实战课程分两种情况
					if(course.find('div.moco-course-box-li')){
						
						course_data.name = course.find('div.moco-course-box-li').find('p').text();
						course_data.img = '';
						course_data.URL = 'www.imooc.com' + course.prop('href');	
						course_data.description = course_data.name;
						course_data.difficultLevel = '高';
						course_data.price = course.find('div.moco-course-box-li').find('span').text() ;
						course_data.proven = '是';

						courseArray.push(course_data);
						course_data = {};
					}	

					/*if(course.find('div.innerBox.pa')){
						course_data.URL = 'www.imooc.com' + course.prop('href');	
						course_data.name = course.find('div.innerBox.pa').find('p').text();
						course_data.price = course.find('div.innerBox.pa').find('span').text();
						course_data.difficultLevel = '高';
						course.description = course_data.name;
						course_data.proven = '是';
						course_data.img = '';

						courseArray.push(course_data);
						course_data = {};
					}		*/	
				} else { //非实战课程
					let course_data = {};
					
					course_data.name = course.find('div.moco-course-intro').find('h3').contents().eq(2).text().trim();
					course_data.img = course.find('div.moco-course-box').find('img').prop('src');
					course_data.URL = 'www.imooc.com' + course.prop('href');
					course_data.description = course.find('div.moco-course-intro').find('p').text();
					course_data.difficultLevel = course.find('div.moco-course-intro').find('h3').find('i').text();					
					course_data.price = 0;
					course_data.proven = "否";

					courseArray.push(course_data);
					course_data = {};
				}
				
			});
			
		}
		return courseArray;
	}

	static async filter_data(req, res){
		let new_data = []; 
		let course_data = {};
		for(let m = 0; m < req.length; m++){
			if(req[m].name.length){ 
				
					
				course_data.name = req[m].name;
				course_data.img = req[m].img;
				course_data.URL = req[m].URL;
				course_data.description = req[m].description;
				course_data.difficultLevel = req[m].difficultLevel;					
				course_data.price = req[m].price;
				course_data.proven = req[m].proven;

				new_data.push(course_data);//console.log(course_data)
				course_data= {};	
			}
		}
		return new_data;
	}

	static async convert_csv(req, res){

		let fields = ['name', 'img', 'URL', 'description', 'difficultLevel', 'price', 'proven'];
		let result;
		try{
			let csv = json2csv({data: req, fields: fields});

			result = await fs.writeFile('immoc_fonted.csv', csv);
		} catch (error){
			console.log("Error:" + error);
		}

		console.log("success");

	}

	static async execute(req, res){
		let get_url = await AllClass.get_url();

		let get_pages = await AllClass.get_pages(get_url)

		let course_data = await AllClass.course_data(get_pages);

		let filter_data = await AllClass.filter_data(course_data);

		let convert_data = await AllClass.convert_csv(filter_data);
	}
}

AllClass.execute();