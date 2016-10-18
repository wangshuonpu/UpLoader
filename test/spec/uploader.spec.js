/**
 * 图片上传组件单元测试 
 * @author Varsha
 */

define(function (require) {

    var ImgUploader = require('../../src/ImgUploader');
    var imgUploader = new ImgUploader({
        formContainer: '.input-wrap',
        container: '.main-wrap'
    });

    describe('ImgUploader', function() {

        describe('constructor', function () {

            it('init dom', function () {
                var input = $('.input-wrap').find('form');
                expect(input).not.toBe(null);
            });

        });

        describe('._getImgs(index, key)', function () {

            it('get imgs info', function () {
                var index = 2;
                imgUploader._setImgs(index, 'state', 3);
                expect(imgUploader._getImgs(index, 'state')).toBe(3);
            });

        });

        describe('._setImgs(index, key, value)', function () {

            it('set single value', function () {
                imgUploader._setImgs(1, 'state', 4);
                expect(imgUploader._imgs[1].state).toBe(4);
            });

            it('set multipel values', function () {
                var info = {
                    state: 1,
                    urls: 'img.jpg'
                }

                imgUploader._setImgs(1, info);
                expect(imgUploader._imgs[1].urls).toBe('img.jpg');
            });

        });

        describe('._createXhr(index, img)', function () {

            it('create xhr', function () {
				var xhr = imgUploader._createXhr(0, 'img data');
                expect(xhr instanceof XMLHttpRequest).toBeTruthy();
            });

        });

        describe('._createImgBoxs(index, img)', function () {

            it('create img box', function () {
				imgUploader._createImgBoxes(3);
                var imgBoxs = $('.main-wrap').find('div[data-role=image-wrap]');
                expect(imgBoxs.length).toBe(3);
            });

        });

        describe('._failHandler(index, img, res)', function () {

            imgUploader._setImgs(0, 'alert', $('div[data-role="image-wrap"][data-id="0"] div[data-role="alert"]'));

            beforeEach(function () {
				imgUploader._failHandler(0, 'fakeImgData', 'response');
            });
            it('fail state set', function () {
                expect(imgUploader._getImgs(0, 'state')).toBe(3);
            });

            var onfail = jasmine.createSpy();
            imgUploader.onfail = function () {
                onfail();
            }
            it('call onfail', function () {
                expect(onfail).toHaveBeenCalled();
            });
        });


        describe('._overSize(index)', function () {

            beforeEach(function () {
                imgUploader._overSize(0);
            })

            it('oversize state set', function () {
                expect(imgUploader._getImgs(0, 'state')).toBe(4);
            });

        });

    });
});
