/**
 * @file
 * @author Varsha (wangshuo16@baidu.com)
 * @date 16/4/10
 * @description
 *
 */

define(function (require) {

    var fileUpload = require('fileUpload');

    return {
        init: function () {
            fileUpload.init({
                formContainer: '.input-wrap',
                container: '.main-wrap'
            });
        }
    };
});