import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { searchHistoryController } from './searchHistory.controller';
import { searchHistoryValidation } from './searchHistory.validation';

const router = express.Router();

router.post(
'/',
auth(),
validateRequest(searchHistoryValidation.createSchema),
searchHistoryController.createSearchHistory,
);

router.get('/', auth(), searchHistoryController.getSearchHistoryList);

router.get('/:id', auth(), searchHistoryController.getSearchHistoryById);


router.delete('/:id', auth(), searchHistoryController.deleteSearchHistory);

export const searchHistoryRoutes = router;